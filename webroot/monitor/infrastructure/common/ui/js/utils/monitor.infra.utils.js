define([
    'underscore',
    'contrail-list-model',
    'js/views/LoginWindowView',
    'js/models/LoginWindowModel'
], function (_, ContrailListModel, LoginWindowView, LoginWindowModel) {
    var MonitorInfraUtils = function () {
        var self = this;
        var noDataStr = monitorInfraConstants.noDataStr;
        // var isProcessExcluded = self.isProcessExcluded;
        infraMonitorAlertUtils = {
            /**
            * Process-specific alerts
            */
            getProcessAlerts : function(data,obj,processPath) {
                var res,filteredResponse = [],downProcess = 0,backOffProcess = 0,
                    lastExitTime,lastStopTime,strtngProcess = 0;
                if(processPath != null)
                    res = getValueByJsonPath(data['value'],processPath,[]);
                else
                    res = ifNull(jsonPath(data,'$..NodeStatus.process_info')[0],[]);
                var alerts=[];
                var infoObj = {type:obj['display_type'],link:obj['link']};
                if(obj['isUveMissing'] == true)
                    return alerts;
                filteredResponse = $.grep(res,function(obj,idx){
                    return !self.isProcessExcluded(obj['process_name']);
                })
                if(filteredResponse.length == 0){
                    if(IS_NODE_MANAGER_INSTALLED){
                        alerts.push($.extend({
                            sevLevel: sevLevels['ERROR'],
                            name: data['name'],
                            pName: obj['display_type'],
                            msg: infraAlertMsgs['PROCESS_STATES_MISSING']
                        }, infoObj));
                    }
                } else {
                    for(var i=0;i<filteredResponse.length;i++) {
                        lastExitTime =  undefined;
                        lastStopTime =  undefined;
                        if(filteredResponse[i]['core_file_list']!=undefined && filteredResponse[i]['core_file_list'].length>0) {
                            var msg = infraAlertMsgs['PROCESS_COREDUMP'].format(filteredResponse[i]['core_file_list'].length);
                            var restartCount = ifNull(filteredResponse[i]['exit_count'],0);
                            if(restartCount > 0)
                                msg +=", "+ infraAlertMsgs['PROCESS_RESTART'].format(restartCount);
                            alerts.push($.extend({
                                tooltipAlert: false,
                                sevLevel: sevLevels['INFO'],
                                name: data['name'],
                                pName: filteredResponse[i]['process_name'],
                                msg: msg
                            }, infoObj));
                        }
                        var procName = filteredResponse[i]['process_name'];
                        var procState = filteredResponse[i]['process_state'];
                        /*
                        * Different process states and corresponding node color and message
                        * PROCESS_STATE_STOPPPED: red, process stopped message
                        * PROCESS_STATE_STARTING: blue, process starting message
                        * PROCESS_STATE_BACKOFF: orange, process down message
                        * rest all states are with red color and process down message
                        */
                        if (procState != null && procState != 'PROCESS_STATE_STOPPED' && procState != 'PROCESS_STATE_RUNNING'
                            && procState != 'PROCESS_STATE_BACKOFF' && procState != 'PROCESS_STATE_STARTING') {
                            downProcess++;
                            if(filteredResponse[i]['last_exit_time'] != null)
                                lastExitTime = filteredResponse[i]['last_exit_time'];
                            alerts.push($.extend({
                                tooltipAlert: false,
                                name: data['name'],
                                pName: procName,
                                msg: infraAlertMsgs['PROCESS_DOWN_MSG'].format(procName),
                                timeStamp: lastExitTime,
                                sevLevel: sevLevels['ERROR']
                            }, infoObj));
                        } else if (procState == 'PROCESS_STATE_STOPPED') {
                            downProcess++;
                            if(filteredResponse[i]['last_stop_time'] != null)
                                lastStopTime = filteredResponse[i]['last_stop_time'];
                            alerts.push($.extend({
                                tooltipAlert: false,
                                name: data['name'],
                                pName: procName,
                                msg: infraAlertMsgs['PROCESS_STOPPED'].format(procName),
                                timeStamp: lastStopTime,
                                sevLevel: sevLevels['ERROR']
                            }, infoObj));
                        } else if (procState == 'PROCESS_STATE_BACKOFF') {
                            backOffProcess++;
                            if(filteredResponse[i]['last_exit_time'] != null)
                                lastExitTime = filteredResponse[i]['last_exit_time'];
                            alerts.push($.extend({
                                tooltipAlert: false,
                                name: data['name'],
                                pName: procName,
                                msg: infraAlertMsgs['PROCESS_DOWN_MSG'].format(procName),
                                timeStamp: lastExitTime,
                                sevLevel: sevLevels['WARNING']
                            }, infoObj));
                        } else if (procState == 'PROCESS_STATE_STARTING') {
                            strtngProcess++;
                            alerts.push($.extend({
                                tooltipAlert: false,
                                name: data['name'],
                                pName: procName,
                                msg: infraAlertMsgs['PROCESS_STARTING_MSG'].format(procName),
                                timeStamp: undefined, //we are not showing the time stamp for the process in
                                sevLevel: sevLevels['INFO'] // starting state
                            }, infoObj));
                            //Raise only info alert if process_state is missing for a process??
                        } else if  (procState == null) {
                            downProcess++;
                            alerts.push($.extend({
                                tooltipAlert: false,
                                name: data['name'],
                                pName: filteredResponse[i]['process_name'],
                                msg: infraAlertMsgs['PROCESS_DOWN_MSG'].format(filteredResponse[i]['process_name']),
                                timeStamp: filteredResponse[i]['last_exit_time'],
                                sevLevel: sevLevels['INFO']
                            }, infoObj));
                                /*msg +=", "+infraAlertMsgs['RESTARTS'].format(restartCount);
                            alerts.push($.extend({name:data['name'],pName:filteredResponse[i]['process_name'],type:'core',msg:msg},infoObj));*/
                        }
                    }
                    if(downProcess > 0)
                        alerts.push($.extend({
                            detailAlert: false,
                            sevLevel: sevLevels['ERROR'],
                            msg: infraAlertMsgs['PROCESS_DOWN'].format(downProcess + backOffProcess)
                        }, infoObj));
                    else if(backOffProcess > 0)
                        alerts.push($.extend({
                            detailAlert: false,
                            sevLevel: sevLevels['WARNING'],
                            msg: infraAlertMsgs['PROCESS_DOWN'].format(backOffProcess)
                        }, infoObj));
                    if(strtngProcess > 0)
                        alerts.push($.extend({
                            detailAlert: false,
                            sevLevel: sevLevels['INFO'],
                            msg: infraAlertMsgs['PROCESS_STARTING'].format(strtngProcess)
                        }, infoObj));
                }
                return alerts.sort(dashboardUtils.sortInfraAlerts);
            },
            processvRouterAlerts : function(obj) {
                var alertsList = [];
                var infoObj = {
                    name: obj['name'],
                    type: 'vRouter',
                    ip: obj['ip'],
                    link: obj['link']
                };
                if(obj['isNTPUnsynced']){
                    alertsList.push($.extend({}, {
                        sevLevel: sevLevels['ERROR'],
                        msg: infraAlertMsgs['NTP_UNSYNCED_ERROR']
                    }, infoObj));
                }
                if(obj['isUveMissing'] == true)
                    alertsList.push($.extend({}, {
                        msg: infraAlertMsgs['UVE_MISSING'],
                        sevLevel: sevLevels['ERROR'],
                        tooltipLbl: 'Events'
                    }, infoObj));
                if(obj['isConfigMissing'] == true)
                    alertsList.push($.extend({}, {
                        msg: infraAlertMsgs['CONFIG_MISSING'],
                        sevLevel: sevLevels['WARNING']
                    }, infoObj));
                //Alerts that are applicable only when both UVE & config data present
                if(obj['isConfigMissing'] == false && obj['isUveMissing'] == false) {
                    if(obj['uveCfgIPMisMatch'] == true)
                        alertsList.push($.extend({}, {
                            msg: infraAlertMsgs['CONFIG_IP_MISMATCH'],
                            sevLevel: sevLevels['ERROR'],
                            tooltipLbl: 'Events'
                        }, infoObj));
                }
                //Alerts that are applicable only when UVE data is present
                if(obj['isUveMissing'] == false) {
                    if(obj['isPartialUveMissing'] == true)
                        alertsList.push($.extend({}, {
                            sevLevel: sevLevels['INFO'],
                            msg: infraAlertMsgs['PARTIAL_UVE_MISSING'],
                            tooltipLbl: 'Events'
                        }, infoObj));
                    if(obj['errorIntfCnt'] > 0)
                        alertsList.push($.extend({}, {
                            sevLevel: sevLevels['WARNING'],
                            msg: infraAlertMsgs['INTERFACE_DOWN'].format(obj['errorIntfCnt']),
                            tooltipLbl: 'Events'
                        }, infoObj));
                    if(obj['xmppPeerDownCnt'] > 0)
                        alertsList.push($.extend({}, {
                            sevLevel: sevLevels['ERROR'],
                            msg: infraAlertMsgs['XMPP_PEER_DOWN'].format(obj['xmppPeerDownCnt']),
                            tooltipLbl: 'Events'
                        }, infoObj));
                }
                return alertsList.sort(dashboardUtils.sortInfraAlerts);
            },
            processControlNodeAlerts : function(obj) {
                var alertsList = [];
                var infoObj = {
                    name: obj['name'],
                    type: 'Control Node',
                    ip: obj['ip'],
                    link: obj['link']
                };
                if(obj['isNTPUnsynced']){
                    alertsList.push($.extend({}, {
                        sevLevel: sevLevels['ERROR'],
                        msg: infraAlertMsgs['NTP_UNSYNCED_ERROR']
                    }, infoObj));
                }
                if(obj['isUveMissing'] == true)
                    alertsList.push($.extend({}, {
                        sevLevel: sevLevels['ERROR'],
                        msg: infraAlertMsgs['UVE_MISSING']
                    }, infoObj));
                if(obj['isConfigMissing'] == true)
                    alertsList.push($.extend({}, {
                        sevLevel: sevLevels['ERROR'],
                        msg: infraAlertMsgs['CONFIG_MISSING']
                    }, infoObj));
                if(obj['isUveMissing'] == false) {
                    //ifmap down alerts for control node
                    if(obj['isIfmapDown']) {
                        alertsList.push($.extend({
                            sevLevel: sevLevels['ERROR'],
                            msg: infraAlertMsgs['IFMAP_DOWN'],
                            timeStamp: obj['ifmapDownAt']
                        }, infoObj));
                    }
                    if(obj['isPartialUveMissing'] == true)
                        alertsList.push($.extend({}, {
                            sevLevel: sevLevels['INFO'],
                            msg: infraAlertMsgs['PARTIAL_UVE_MISSING']
                        }, infoObj));
                    if(obj['downXMPPPeerCnt'] > 0)
                        alertsList.push($.extend({}, {
                            sevLevel: sevLevels['WARNING'],
                            msg: infraAlertMsgs['XMPP_PEER_DOWN'].format(obj['downXMPPPeerCnt'])
                        }, infoObj));
                    if(obj['downBgpPeerCnt'] > 0)
                        alertsList.push($.extend({}, {
                            sevLevel: sevLevels['WARNING'],
                            msg: infraAlertMsgs['BGP_PEER_DOWN'].format(obj['downBgpPeerCnt'])
                        }, infoObj));
                }
                //Alerts that are applicable only when both UVE and config data are present
                if(obj['isUveMissing'] == false && obj['isConfigMissing'] == false) {
                    if(typeof(obj['totalBgpPeerCnt']) == "number" &&
                        obj['configuredBgpPeerCnt'] != obj['totalBgpPeerCnt'])
                        alertsList.push($.extend({}, {
                            sevLevel: sevLevels['WARNING'],
                            msg: infraAlertMsgs['BGP_CONFIG_MISMATCH']
                        }, infoObj));
                    if(obj['uveCfgIPMisMatch'])
                        alertsList.push($.extend({}, {
                            sevLevel: sevLevels['ERROR'],
                            msg: infraAlertMsgs['CONFIG_IP_MISMATCH']
                        }, infoObj));
                }
                return alertsList.sort(dashboardUtils.sortInfraAlerts);
            },
            processConfigNodeAlerts : function(obj) {
                var alertsList = [];
                var infoObj = {
                    name: obj['name'],
                    type: 'Config Node',
                    ip: obj['ip'],
                    link: obj['link']
                };
                if(obj['isNTPUnsynced'])
                    alertsList.push($.extend({}, {
                        sevLevel: sevLevels['ERROR'],
                        msg: infraAlertMsgs['NTP_UNSYNCED_ERROR']
                    }, infoObj));
                if(obj['isUveMissing'] == true)
                    alertsList.push($.extend({}, {
                        sevLevel: sevLevels['ERROR'],
                        msg: infraAlertMsgs['UVE_MISSING']
                    }, infoObj));
        //        if(obj['isConfigMissing'] == true)
        //            alertsList.push($.extend({},{sevLevel:sevLevels['ERROR'],msg:infraAlertMsgs['CONFIG_MISSING']},infoObj));
                if(obj['isUveMissing'] == false){
                    if(obj['isPartialUveMissing'] == true)
                        alertsList.push($.extend({}, {
                            sevLevel: sevLevels['INFO'],
                            msg: infraAlertMsgs['PARTIAL_UVE_MISSING']
                        }, infoObj));
                }
                return alertsList.sort(dashboardUtils.sortInfraAlerts);
            },
            processAnalyticsNodeAlerts : function(obj) {
                var alertsList = [];
                var infoObj = {
                    name: obj['name'],
                    type: 'Analytics Node',
                    ip: obj['ip'],
                    link: obj['link']
                };
                if(obj['isNTPUnsynced']){
                    alertsList.push($.extend({}, {
                        sevLevel: sevLevels['ERROR'],
                        msg: infraAlertMsgs['NTP_UNSYNCED_ERROR']
                    }, infoObj));
                }
                if(obj['isUveMissing'] == true){
                    alertsList.push($.extend({}, {
                        sevLevel: sevLevels['ERROR'],
                        msg: infraAlertMsgs['UVE_MISSING']
                    }, infoObj));
                }
                if(obj['isUveMissing'] == false) {
                    if(obj['isPartialUveMissing'] == true){
                        alertsList.push($.extend({}, {
                            sevLevel: sevLevels['INFO'],
                            msg: infraAlertMsgs['PARTIAL_UVE_MISSING']
                        }, infoObj));
                    }
                }
                if(obj['errorStrings'] != null && obj['errorStrings'].length > 0){
                    $.each(obj['errorStrings'],function(idx,errorString){
                        alertsList.push($.extend({}, {
                            sevLevel: sevLevels['WARNING'],
                            msg: errorString
                        }, infoObj));
                    });
                }
                return alertsList.sort(dashboardUtils.sortInfraAlerts);
            },
            processDbNodeAlerts : function(obj) {
                var alertsList = [];
                var infoObj = {
                    name: obj['name'],
                    type: 'Database Node',
                    ip: obj['ip'],
                    link: obj['link']
                };

                if(obj['isNTPUnsynced']){
                    alertsList.push($.extend({}, {
                        sevLevel: sevLevels['ERROR'],
                        msg: infraAlertMsgs['NTP_UNSYNCED_ERROR']
                    }, infoObj));
                }
                if(obj['isUveMissing'] == true){
                    alertsList.push($.extend({}, {
                        sevLevel: sevLevels['ERROR'],
                        msg: infraAlertMsgs['UVE_MISSING']
                    }, infoObj));
                }
        //        if(obj['isConfigMissing'] == true){
        //            alertsList.push($.extend({},{sevLevel:sevLevels['ERROR'],msg:infraAlertMsgs['CONFIG_MISSING']},infoObj));
        //        }
                if(obj['isUveMissing'] == false && obj['isPartialUveMissing'] == true){
                    alertsList.push($.extend({}, {
                        sevLevel: sevLevels['INFO'],
                        msg: infraAlertMsgs['PARTIAL_UVE_MISSING']
                    }, infoObj));
                }
                if(obj['usedPercentage'] >= 70 && obj['usedPercentage'] < 90){
                    alertsList.push($.extend({}, {
                        sevLevel: sevLevels['WARNING'],
                        msg: infraAlertMsgs['SPACE_USAGE_WARNING'].format('Database')
                    }, infoObj));
                } else if(obj['usedPercentage'] >= 90){
                    alertsList.push($.extend({}, {
                        sevLevel: sevLevels['ERROR'],
                        msg: infraAlertMsgs['SPACE_THRESHOLD_EXCEEDED'].format('Database')
                    }, infoObj));
                }
                return alertsList.sort(dashboardUtils.sortInfraAlerts);
            }
        }

        self.getGridPaginationControls = function() {
            return [
                        '<a class="widget-toolbar-icon"><i class="icon-step-forward"></i></a>',
                        '<a class="widget-toolbar-icon"><i class="icon-forward"></i></a>',
                        '<a class="widget-toolbar-icon"><i class="icon-backward"></i></a>',
                        '<a class="widget-toolbar-icon"><i class="icon-step-backward"></i></a>'
                    ];
        }

        self.formatMemory = function(memory) {
            if(memory == null || memory['res'] == null)
                return noDataStr;
            return self.formatMemoryForDisplay (memory['res']);
        }

        self.formatMemoryForDisplay = function (memory) {
            if (memory == null)
                return noDataStr;
            return contrail.format('{0}', formatBytes(parseInt(memory) * 1024));
        }

        self.getVrouterIpAddresses = function(data,pageType) {
            var ips,controlIp;
            var configip = noDataStr;
            var ipString = "";
            var isConfigMismatch = true;
            try{
                controlIp = getValueByJsonPath(data,'VrouterAgent;control_ip',noDataStr);
                ips = getValueByJsonPath(data,'VRouterAgent;self_ip_list',[]);
                configip = getValueByJsonPath(data,'ConfigData;virtual-router;virtual_router_ip_address');
                if(controlIp != null && controlIp != noDataStr){
                    ipString = controlIp;
                }
                if(configip == controlIp) {
                    isConfigMismatch = false;
                }
                $.each(ips, function (idx, ip){
                    if(ip == configip){
                        isConfigMismatch = false;
                    }
                    if(ip != controlIp){
                        ipString += ", " + ip;
                        if(idx == 0){
                            ipString += "*";
                        }
                    } else {
                        ipString += "*"
                    }
                });
                if(configip != null && isConfigMismatch){
                    if(ipString != ""){
                        ipString += ","
                    }
                    if(pageType == "summary"){
                        ipString = ipString +  configip ;
                    } else if (pageType == "details"){
                        ipString = ipString + "<span class='text-error' title='Config IP mismatch'> "+ configip +"</span>";
                    }
                }
            } catch(e){}
            return ipString;
        }

        self.parseUveHistoricalValues = function(d,path,histPath) {
            var histData;
            if(histPath != null)
                histData = getValueByJsonPath(d,histPath,[]);
            else
                histData = ifNull(jsonPath(d,path)[0],[]);
            var histDataArr = [];
            $.each(histData,function(key,value) {
                histDataArr.push([JSON.parse(key)['ts'],value]);
            });
            histDataArr.sort(function(a,b) { return a[0] - b[0];});
            histDataArr = $.map(histDataArr,function(value,idx) {
                return value[1];
            });
            return histDataArr;
        }

        /**
        * Return false if is there is no severity alert that decides color
        */
        self.getNodeColor = function (obj) {
            obj = ifNull(obj,{});
            //Check if there is any nodeAlert and if yes,
            //get the highest severity alert
            var nodeAlertSeverity = -1,processLevelSeverity = -1;
            if(obj['nodeAlerts'].length > 0) {
                nodeAlertSeverity = obj['nodeAlerts'][0]['sevLevel'];
            }
            //Check if any process Alerts
            if(obj['processAlerts'].length > 0) {
                processLevelSeverity = obj['processAlerts'][0]['sevLevel'];
            }
            if(nodeAlertSeverity == sevLevels['ERROR'] ||
                    processLevelSeverity == sevLevels['ERROR'])
                return ctwc.COLOR_SEVERITY_MAP['red'];
            if(nodeAlertSeverity == sevLevels['WARNING'] ||
                    processLevelSeverity == sevLevels['WARNING'])
                return ctwc.COLOR_SEVERITY_MAP['orange'];
            return false;
        };

        self.getConfigNodeColor = function (d,obj) {
            obj= ifNull(obj,{});
            var nodeColor = self.getNodeColor(obj);
            if(nodeColor != false)
                return nodeColor;
            return ctwc.COLOR_SEVERITY_MAP['blue'];
        };

        self.getControlNodeColor = function (d,obj) {
            obj= ifNull(obj,{});
            var nodeColor = self.getNodeColor(obj);
            if(nodeColor != false)
                return nodeColor;
            //If connected to atleast one XMPP Peer
            if(obj['totalXMPPPeerCnt'] - obj['downXMPPPeerCnt'] > 0)
                return ctwc.COLOR_SEVERITY_MAP['green'];
            else if(obj['downBgpPeerCnt'] == 0 && obj['downXMPPPeerCnt'] == 0)
                return ctwc.COLOR_SEVERITY_MAP['blue'];    //Default color
        };

        self.getDatabaseNodeColor = function (d,obj) {
            obj= ifNull(obj,{});
            var nodeColor = self.getNodeColor(obj);
            if(nodeColor != false)
                return nodeColor;
            return ctwc.COLOR_SEVERITY_MAP['blue'];
        };

        self.getAnalyticsNodeColor = function (d, obj) {
            obj= ifNull(obj,{});
            var nodeColor = self.getNodeColor(obj);
            if(nodeColor != false)
                return nodeColor;
            return ctwc.COLOR_SEVERITY_MAP['blue'];
        };

        self.getvRouterColor = function(d,obj) {
            var nodeColor = self.getNodeColor(obj);
            if(nodeColor != false)
                return nodeColor;
            obj = ifNull(obj,{});
            var instCnt = obj['instCnt'];
            if(instCnt == 0)
                return ctwc.COLOR_SEVERITY_MAP['blue'];
            else if(instCnt > 0)
                return ctwc.COLOR_SEVERITY_MAP['green'];
        };

        self.getGeneratorsAjaxConfigForInfraNodes = function (dsName,responseJSON) {
            var ajaxConfig = {};
            var kfilts;
            var cfilts;
            if(dsName == 'controlNodeDS') {
                kfilts =  '*:' + monitorInfraConstants.UVEModuleIds['CONTROLNODE'] + '*';
                cfilts =  'ModuleClientState:client_info,'+
                          'ModuleServerState:generator_info';
            } else if(dsName == 'computeNodeDS') {
                //Handling the case module id will change for the TOR agent/ TSN
                //We need to send all the module ids if different
                var items = responseJSON;
                var kfiltString = ""
                var moduleIds = [];
                $.each(items,function(i,d){
                    if(moduleIds.indexOf(d['moduleId']) == -1){
                        moduleIds.push(d['moduleId']);
                        //Exclude getting contrail-tor-agent generators
                        if(d['moduleId'] == 'contrail-tor-agent') {
                            return;
                        }
                        if(kfiltString != '')
                            kfiltString += ',';
                        kfiltString += '*:' + d['moduleId'] + '*';
                    }
                });
                kfilts =  kfiltString;
                cfilts = 'ModuleClientState:client_info,'+
                         'ModuleServerState:generator_info';
            } else if(dsName == 'analyticsNodeDS') {
                kfilts = '*:' + monitorInfraConstants.UVEModuleIds['COLLECTOR'] + '*,*:' +
                                monitorInfraConstants.UVEModuleIds['OPSERVER'] + '*,*:' +
                                monitorInfraConstants.UVEModuleIds['QUERYENGINE'] + '*';
                cfilts = 'ModuleClientState:client_info,'+
                         'ModuleServerState:generator_info';
            } else if(dsName == 'configNodeDS') {
                kfilts = '*:' + monitorInfraConstants.UVEModuleIds['APISERVER'] + '*';
                cfilts = 'ModuleClientState:client_info,'+
                         'ModuleServerState:generator_info';
            }

            var postData = self.getPostData("generator",'','',cfilts,kfilts);

            ajaxConfig = {
                    url:TENANT_API_URL,
                    type:'POST',
                    data:JSON.stringify(postData)
                };
            return ajaxConfig;
        };

        self.getAjaxConfigForInfraNodesCpuStats = function (dsName,responseJSON) {
            var ajaxConfig = {};
            //build the query
            var postData = self.getPostDataForCpuMemStatsQuery({
                nodeType:dsName,
                node:''});
            ajaxConfig = {
                url: monitorInfraConstants.monitorInfraUrls['QUERY'],
                type:'POST',
                data:JSON.stringify(postData)
            }
            return ajaxConfig;
        };


        self.parseInfraGeneratorsData = function(result) {
            var retArr = [];
            if(result != null && result[0] != null){
                result = result[0].value;
            } else {
                result = [];
            }
            $.each(result,function(idx,d){
                var obj = {};
                obj['status'] = self.getOverallNodeStatusFromGenerators(d);
                obj['name'] = d['name'];
                retArr.push(obj);
            });
            return retArr;
        };

        //If current process is part of exclude process list,then return true; else return false
        self.isProcessExcluded = function(procName) {
            //Exclude specific (node mgr,nova-compute for compute node) process alerts
            var excludeProcessList = monitorInfraConstants.excludeProcessList;
            var excludeProcessLen = excludeProcessList.length;
            for(var i=0;i<excludeProcessLen;i++) {
                if(procName.indexOf(excludeProcessList[i]) > -1)
                    return true;
            }
            return false;
        }

        self.isNTPUnsynced = function(nodeStatus) {
            if(nodeStatus == null || !nodeStatus || nodeStatus.process_status == null){
                return false;
            }
            var processStatus = nodeStatus.process_status;
            for(var i = 0; i < processStatus.length; i++){
                var procstat = processStatus[i];
                if(procstat.description != null &&
                    procstat.description.toLowerCase().indexOf("ntp state unsynchronized") != -1){
                    return true;
                }
            }
        }
        self.getPostData = function(type,module,hostname,cfilt,kfilt) {
            var cfiltObj = {};
            var postData;
            if(type != null && type != ""){
                cfiltObj["type"] = type;
            } else {
                return null;
            }
            if(module != null && module != ""){
                cfiltObj["module"] = module;
            }
            if(hostname != null && hostname != ""){
                cfiltObj["hostname"] = hostname;
            }
            if(cfilt != null && cfilt != ""){
                cfiltObj["cfilt"] = cfilt;
            }
            if(kfilt != null && kfilt != ""){
                cfiltObj["kfilt"] = kfilt;
            }
            postData = {data:[cfiltObj]};
            return postData;
        }

        /**
        * Claculates node status based on process_info & generators
        * ToDo: use getOverallNodeStatusFromGenerators
        */
        self.getOverallNodeStatus = function(d,nodeType,processPath) {
            var status = "--";
            var generatorDownTime;
            //For Analytics node if there are error strings in the UVE display it as Down
            if(nodeType != null && nodeType == 'analytics'){
                try{
                    var errorStrings = jsonPath(d,"$..ModuleCpuState.error_strings")[0];
                }catch(e){}
                if(errorStrings && errorStrings.length > 0){
                    return 'Down';
                }
            }
            var procStateList;
            if(processPath != null)
                procStateList = getValueByJsonPath(d,processPath);
            else
                procStateList = jsonPath(d,"$..NodeStatus.process_info")[0];
            if(procStateList != null && procStateList != undefined && procStateList != "") {
                status = self.getOverallNodeStatusFromProcessStateList(procStateList);
                //Check if any generator is down. This may happen if the process_info is not updated due to some reason
                if(status.search("Up") != -1){
                    generatorDownTime = self.getMaxGeneratorDownTime(d);
                    if(generatorDownTime != -1){
                        try{
                            var resetTime = new XDate(generatorDownTime/1000);
                            var currTime = new XDate();
                            status = 'Down since ' + diffDates(resetTime,currTime);
                        }catch(e){
                            status = 'Down';
                        }
                    }
                }
            } else {
                //For each process get the generator_info and fetch the gen_attr which is having the highest connect_time. This is because
                //we are interseted only in the collector this is connected to the latest.
                //From this gen_attr see if the reset_time > connect_time. If yes then the process is down track it in down list.
                //Else it is up and track in uplist.
                //If any of the process is down get the least reset_time from the down list and display the node as down.
                //Else get the generator with max connect_time and show the status as Up.
                try{
                    var genInfos = ifNull(jsonPath(d,"$..ModuleServerState..generator_info"),[]);
                    if(!genInfos){
                        return 'Down';
                    }
                    var upGenAttrs = [];
                    var downGenAttrs = [];
                    var isDown = false;
                    $.each(genInfos,function(idx,genInfo){
                        var genAttr = self.getMaxGeneratorValueInArray(genInfo,"connect_time");
                        var connTime = jsonPath(genAttr,"$..connect_time")[0];
                        var resetTime = jsonPath(genAttr,"$..reset_time")[0];
                        if(resetTime > connTime){
                            isDown = true;
                            downGenAttrs.push(genAttr);
                        } else {
                            upGenAttrs.push(genAttr);
                        }
                    });
                    if(!isDown){
                        var maxConnTimeGen = self.getMaxGeneratorValueInArray(upGenAttrs,"connect_time");
                        var maxConnTime = jsonPath(maxConnTimeGen,"$..connect_time")[0];
                        var connectTime = new XDate(maxConnTime/1000);
                        var currTime = new XDate();
                        status = 'Up since ' + diffDates(connectTime,currTime);
                    } else {
                        var minResetTimeGen = self.getMinGeneratorValueInArray(downGenAttrs,"reset_time");
                        var minResetTime = jsonPath(minResetTimeGen,"$..reset_time")[0];
                        var resetTime = new XDate(minResetTime/1000);
                        var currTime = new XDate();
                        status = 'Down since ' + diffDates(resetTime,currTime);
                    }
                }catch(e){}
            }
            return status;
        }
        self.getOverallNodeStatusFromProcessStateList = function(d) {
            var maxUpTime=0, maxDownTime=0, isAnyNodeDown=false, status = "";
            for(var i=0; i < d.length; i++){
                var currProc = d[i];
                //Exclude specific (node mgr,nova-compute for compute node) process alerts
                if(self.isProcessExcluded(currProc['process_name']))
                    continue;
                if(currProc != null && currProc.process_state != null &&
                    currProc.process_state.toUpperCase() == "PROCESS_STATE_RUNNING"){
                    if(currProc.last_start_time != null && currProc.last_start_time > maxUpTime){
                        maxUpTime = currProc.last_start_time;
                    }
                } else {
                    if(currProc.last_exit_time != null || currProc.last_stop_time != null){
                        isAnyNodeDown = true;
                        var maxProcDownTime=0,exitTime=0,stopTime=0;
                        if(currProc.last_exit_time != null){
                            exitTime = currProc.last_exit_time;
                        }
                        if(currProc.last_stop_time != null){
                            stopTime = currProc.last_stop_time;
                        }
                        maxProcDownTime = (exitTime > stopTime)?exitTime:stopTime;
                        if(maxProcDownTime > maxDownTime){
                            maxDownTime = maxProcDownTime;
                        }
                    }
                }
            }
            if(!isAnyNodeDown && maxUpTime != 0){
                var upTime = new XDate(maxUpTime/1000);
                var currTime = new XDate();
                status = 'Up since ' + diffDates(upTime,currTime);
            } else if(maxDownTime != 0){
                var resetTime = new XDate(maxDownTime/1000);
                var currTime = new XDate();
                status = 'Down since ' + diffDates(resetTime,currTime);
            } else {
                status = 'Down';
            }
            return status;
        }
        //returns max reset time or -1 if none are down
        self.getMaxGeneratorDownTime = function(d) {
            var genInfos = [];
            var genInfoList = [];
            var maxResetTime = -1;
            try{
                genInfoList = jsonPath(d,"$..ModuleServerState..generator_info");
                for(var i=0; i < genInfoList.length; i++){
                    var currGenInfo = genInfoList[i];
                    var maxConnectTimeGenerator = self.getMaxGeneratorValueInArray(currGenInfo,"connect_time");
                    var maxConnectTimeOfProcess = jsonPath(maxConnectTimeGenerator,"$..connect_time")[0];
                    var resetTimeOfMaxConnectTimeGenerator = jsonPath(maxConnectTimeGenerator,"$..reset_time")[0];
                    if(resetTimeOfMaxConnectTimeGenerator > maxConnectTimeOfProcess){
                        if(maxResetTime < resetTimeOfMaxConnectTimeGenerator){
                            maxResetTime = resetTimeOfMaxConnectTimeGenerator
                        }
                    }
                }
            }catch(e){}
            return maxResetTime;
        }

        self.getMaxGeneratorValueInArray = function(inputArray,selector) {
            var maxVal;
            if(inputArray != null && inputArray['length'] != null && inputArray['length'] > 0) {
                maxVal = inputArray[0];
                for(var i = 1; i < inputArray.length; i++){
                    var curSelectorVal = jsonPath(inputArray[i],"$.."+selector)[0];
                    var maxSelectorVal = jsonPath(maxVal,"$.."+selector)[0];
                    if(curSelectorVal > maxSelectorVal){
                        maxVal = inputArray[i];
                    }
                }
                return maxVal;
            } else {
                return inputArray;
            }
        }

        self.getMinGeneratorValueInArray = function(inputArray,selector) {
            var minVal;
            if(inputArray != null && inputArray['length'] != null && inputArray['length'] > 0) {
                minVal = inputArray[0];
                for(var i = 1; i < inputArray.length; i++){
                    var curSelectorVal = jsonPath(inputArray[i],"$.."+selector)[0];
                    var maxSelectorVal = jsonPath(minVal,"$.."+selector)[0];
                    if(curSelectorVal < maxSelectorVal){
                        minVal = inputArray[i];
                    }
                }
                return minVal;
            } else {
                return inputArray;
            }
        }

        self.getOverallNodeStatusFromGenerators = function () {
            var status = "--";
            var generatorDownTime;


            // For each process get the generator_info and fetch the gen_attr
            // which is having the highest connect_time. This is because
            // we are interseted only in the collector this is connected
            // to the latest.

            // From this gen_attr see if the reset_time > connect_time.

            // If yes then the process is down track it in down list.
            // Else it is up and track in uplist.

            // If any of the process is down get the least reset_time
            // from the down list and display the node as down.

            // Else get the generator with max connect_time and
            // show the status as Up.
            try{
                var genInfos = ifNull(jsonPath(d,
                    "$..ModuleServerState..generator_info"),[]);
                if(!genInfos){
                    return 'Down';
                }
                var upGenAttrs = [];
                var downGenAttrs = [];
                var isDown = false;
                $.each(genInfos,function(idx,genInfo){
                    var genAttr =
                        self.getMaxGeneratorValueInArray(genInfo,"connect_time");
                    var connTime = jsonPath(genAttr,"$..connect_time")[0];
                    var resetTime = jsonPath(genAttr,"$..reset_time")[0];
                    if(resetTime > connTime){
                        isDown = true;
                        downGenAttrs.push(genAttr);
                    } else {
                        upGenAttrs.push(genAttr);
                    }
                });
                if(!isDown){
                    var maxConnTimeGen =
                        self.getMaxGeneratorValueInArray(upGenAttrs,"connect_time");
                    var maxConnTime =
                        jsonPath(maxConnTimeGen,"$..connect_time")[0];
                    var connectTime = new XDate(maxConnTime/1000);
                    var currTime = new XDate();
                    status = 'Up since ' + diffDates(connectTime,currTime);
                } else {
                    var minResetTimeGen =
                        self.getMinGeneratorValueInArray(downGenAttrs,"reset_time");
                    var minResetTime =
                        jsonPath(minResetTimeGen,"$..reset_time")[0];
                    var resetTime = new XDate(minResetTime/1000);
                    var currTime = new XDate();
                    status = 'Down since ' + diffDates(resetTime,currTime);
                }
            }catch(e){}

            return status;
        };

        self.parseAndMergeGeneratorWithPrimaryDataForInfraNodes =
            function(response, primaryDS) {

            var genDSData = self.parseInfraGeneratorsData(response);
            var primaryData = primaryDS.getItems();
            var updatedData = [];
            // to avoid the change event getting triggered
            // copy the data into another array and use it.
            var genData = [];
            $.each(genDSData,function (idx,obj){
                genData.push(obj);
            });
            $.each(primaryData,function(i,d){
                var idx=0;
                while(genData.length > 0 && idx < genData.length){
                    if(genData[idx]['name'].split(':')[0] == d['name']){
                        d['status'] = self.getFinalNodeStatusFromGenerators(
                           genData[idx]['status'],primaryData[i]);
                        d['isGeneratorRetrieved'] = true;
                        genData.splice(idx,1);
                        break;
                    }
                    idx++;
                };
                updatedData.push(d);
            });
            primaryDS.updateData(updatedData);
        };

        self.parseAndMergeCpuStatsWithPrimaryDataForInfraNodes =
            function (response,primaryDS) {
            var statsData = self.parseCpuStatsDataToHistory10(response)
            var primaryData = primaryDS.getItems();
            var updatedData = [];
            $.each(primaryData,function(i,d){
                var idx=0;
                while(statsData.length > 0 && idx < statsData.length){
                    if(statsData[idx]['name'] == d['name']){
                        d['histCpuArr'] = self.parseUveHistoricalValues(statsData[idx],'$.value.history-10');
                        statsData.splice(idx,1);
                        break;
                    }
                    idx++;
                };
                updatedData.push(d);
            });
            primaryDS.updateData(updatedData);
        };

        self.mergeCollectorDataAndPrimaryData = function (collectorData,primaryDS){
            var collectors = ifNull(collectorData.value,[]);
            if(collectors.length == 0){
                return;
            }
            var primaryData = primaryDS.getItems();
            var updatedData = [];
            $.each(primaryData,function(i,d){
                var idx=0;
                while(collectors.length > 0 && idx < collectors.length){
                    if(collectors[idx]['name'] == d['name']){
                        var genInfos = ifNull(jsonPath(collectors[idx],
                                "$.value.CollectorState.generator_infos")[0],[]);
                        d['genCount'] = genInfos.length;
                        collectors.splice(idx,1);
                        break;
                    }
                    idx++;
                };
                updatedData.push(d);
            });
            primaryDS.updateData(updatedData);
        };

        self.parseUveHistoricalValues = function (d,path,histPath) {
            var histData;
            if(histPath != null)
                histData = getValueByJsonPath(d,histPath,[]);
            else
                histData = ifNull(jsonPath(d,path)[0],[]);
            var histDataArr = [];
            $.each(histData,function(key,value) {
                histDataArr.push([JSON.parse(key)['ts'],value]);
            });
            histDataArr.sort(function(a,b) { return a[0] - b[0];});
            histDataArr = $.map(histDataArr,function(value,idx) {
                return value[1];
            });
            return histDataArr;
        }

        self.parseCpuStatsDataToHistory10 = function(statsData){
            var ret = {};
            var retArr = [];
            if(statsData == null && statsData['data'] == null && statsData.length == 0){
                return [];
            }
            statsData = statsData['data'];
            $.each(statsData,function(idx,d){
                var source = d['Source'];
                var t = JSON.stringify({"ts":d['T']});

                if(ret[source] != null && ret[source]['history-10'] != null){
                    var hist10 = ret[source]['history-10'];
                    hist10[t] = d['cpu_info.cpu_share'];
                } else {
                    ret[source] = {};
                    ret[source]['history-10'] = {};
                    ret[source]['history-10'][t] = d['cpu_info.cpu_share'];
                }
            });
            $.each(ret,function(key,val){
               var t = {};
               t["name"] = key;
               t["value"] = val;
               retArr.push(t);
            });
            return retArr;
        },

        self.isProcessStateMissing = function(dataItem) {
            var noProcessStateAlert = $.grep(dataItem['processAlerts'],function(obj,idx) {
                return obj['msg'] == infraAlertMsgs['PROCESS_STATES_MISSING'];
            });
            if(noProcessStateAlert.length > 0)
                return true;
            return false;
        };

        /**
        * ToDo: can be merged with getOverallNodeStatus
        */
        self.getFinalNodeStatusFromGenerators = function(statusFromGen,dataItem) {
            if(self.isProcessStateMissing(dataItem)) {
                return statusFromGen;
            }
            var statusFromProcessStateList = dataItem['status'];
            if(statusFromProcessStateList.search("Up") != -1){
                if(statusFromGen.search("Down") != -1){
                    return statusFromGen;
                } else {
                    return statusFromProcessStateList;
                }
            } else {
                return statusFromProcessStateList;
            }
        }

        // This function accepts the node data and returns the alerts
        // array which need to displayed in chart tooltip.
        self.getTooltipAlerts = function (data) {
            var tooltipAlerts = [];
            if (ifNull(data['alerts'],[]).length > 0) {
               $.each(data['alerts'],function(idx,obj){
                  if(obj['tooltipAlert'] != false)
                      tooltipAlerts.push({
                          label : 'Events',
                          value : ifNull(obj['msg'],"")
                      });
               });
            }
            return tooltipAlerts;
        };

        //Utility get the process uptime given process data
        self.getProcessUpTime = function (d) {
            var upTimeStr = noDataStr;
            if(d != null && d.process_state != null &&
                    d.process_state.toUpperCase() == "PROCESS_STATE_RUNNING") {
                if(d.last_start_time != null){
                    var upTime = new XDate(d.last_start_time/1000);
                    var currTime = new XDate();
                    upTimeStr = 'Up since ' + diffDates(upTime,currTime);
                }
            } else {
                var exitTime=0,stopTime=0;
                var currTime = new XDate();
                if(d.last_exit_time != null){
                    exitTime = d.last_exit_time;
                }
                if(d.last_stop_time != null){
                    stopTime = d.last_stop_time;
                }
                if(exitTime != 0 || stopTime != 0){
                    if(exitTime > stopTime){
                        exitTime = new XDate(exitTime/1000);
                        upTimeStr = 'Down since ' + diffDates(exitTime,currTime);
                    } else {
                        stopTime = new XDate(stopTime/1000);
                        upTimeStr = 'Down since ' + diffDates(stopTime,currTime);
                    }
                } else {
                    upTimeStr = "Down";
                }
            }
            return upTimeStr;
        };

        /*
         * Common function to retrieve the analytics messages count and size
         */
        self.getAnalyticsMessagesCountAndSize = function (d,procList){
            var count = 0,size = 0, obj = {};
            for(var key in d){
                var label = key.toUpperCase();
                $.each(procList,function(idx,proc){
                    if(label.indexOf(":"+proc.toUpperCase()+":") != -1){
                        obj[key] = d[key];
                    }
                });
            }
            var sizes =  ifNull(jsonPath(obj,"$..ModuleClientState.client_info.tx_socket_stats.bytes"),0);
            var counts = ifNull(jsonPath(obj,"$..ModuleClientState.session_stats.num_send_msg"),0);
            $.each(counts,function(i,cnt){
                count += cnt;
            });
            $.each(sizes,function(i,sze){
                size += sze;
            });
            return {count:count,size:size};
        }
        self.getAllLogLevelStats = function(d,proc,logLevelStats) {
            var allStats = [],obj = {};
            for(var key in d){
                var label = key.toUpperCase();
                if(label.indexOf(proc.toUpperCase()) != -1){
                    obj[key] = d[key];
                }
            }
            allStats =  ifNullOrEmptyObject(jsonPath(obj,"$..log_level_stats"),[]);
            if(allStats instanceof Array){
                for(var i = 0; i < allStats.length;i++){
                    if(!($.isEmptyObject(allStats[i]))){
                        if( allStats[i] instanceof Array){
                            logLevelStats = logLevelStats.concat(allStats[i]);
                        } else {
                            logLevelStats.push(allStats[i]);
                        }
                    }
                }
            }
            return logLevelStats;
        }

        //Given the data and the node type get the last log time stamp for the node
        self.getLastLogTimestamp = function (d, nodeType){
            var logLevelStats = [], lastLog, lastTimeStamp;
            var procsList = [];
            if(nodeType != null){
                if(nodeType == "control"){
                    procsList = monitorInfraConstants.controlProcsForLastTimeStamp;
                } else if (nodeType == "compute"){
                    var proces = getValueByJsonPath(d,'NodeStatus;process_status;0;module_id');
                    if(proces != null){
                        procsList = [proces];
                    } else {
                        procsList = monitorInfraConstants.computeProcsForLastTimeStamp;
                    }
                } else if (nodeType =="analytics") {
                    procsList = monitorInfraConstants.analyticsProcsForLastTimeStamp;
                } else if (nodeType =="config"){
                    procsList = monitorInfraConstants.configProcsForLastTimeStamp;
                }
                $.each(procsList,function(idx,proc){
                    logLevelStats = self.getAllLogLevelStats(d,proc,logLevelStats);
                });
            } else {
                logLevelStats = self.getAllLogLevelStats(d,"",logLevelStats);
            }

            if(logLevelStats != null){
                lastLog = self.getMaxGeneratorValueInArray(logLevelStats,"last_msg_timestamp");
                if(lastLog != null){
                    lastTimeStamp = lastLog.last_msg_timestamp;
                }
            }
            return lastTimeStamp;
        }

        self.getPostDataForReachableIpsCall = function(ips,port) {
            var postData;
            var ipPortList = [];
            $.each(ips,function(idx,obj){
                ipPortList.push({ip:obj,port:port});
            });
            postData = {data:ipPortList};
            return postData;
        }

        /**
         * Function returns the overall node status html of monitor infra node
         * details page
         */
        self.getOverallNodeStatusForDetails = function (data){
            var statusObj = this.getNodeStatusForSummaryPages(data);
            var templateData = {result:statusObj['alerts'],showMore:true,defaultItems:1};
            return contrail.getTemplate4Id('overallNodeStatusTemplate')(templateData);
        }

        /**
         * This function takes parsed nodeData from the infra parse functions
         * and returns object with all alerts displaying in dashboard tooltip,
         * and tooltip messages array
         */
        self.getNodeStatusForSummaryPages = function (data,page) {
            var result = {},msgs = [],tooltipAlerts = [];
            for(var i = 0;i < data['alerts'].length; i++) {
                if(data['alerts'][i]['tooltipAlert'] != false) {
                    tooltipAlerts.push(data['alerts'][i]);
                    msgs.push(data['alerts'][i]['msg']);
                }
            }
            //Status is pushed to messages array only if the status is "UP"
            //and tooltip alerts(which are displaying in tooltip) are zero
            if(ifNull(data['status'],"").indexOf('Up') > -1 && tooltipAlerts.length == 0) {
                msgs.push(data['status']);
                tooltipAlerts.push({msg:data['status'],sevLevel:sevLevels['INFO']});
            } else if(ifNull(data['status'],"").indexOf('Down') > -1) {
                //Need to discuss and add the down status
                //msgs.push(data['status']);
                //tooltipAlerts.push({msg:data['status'],sevLevel:sevLevels['ERROR']})
            }
            result['alerts'] = tooltipAlerts;
            result['nodeSeverity'] = data['alerts'][0] != null ?
                    data['alerts'][0]['sevLevel'] : sevLevels['INFO'];
            result['messages'] = msgs;
             var statusTemplate = contrail.getTemplate4Id('statusTemplate');
            if(page == 'summary')
                return statusTemplate({sevLevel:result['nodeSeverity'],
                    sevLevels:sevLevels});
            return result;
        }
        /**
        * This function takes parsed nodeData from the infra parse functions and
        * returns the status column text/html for the summary page grid
        */
        self.getNodeStatusContentForSummayPages = function(data,type){
            var obj = getNodeStatusForSummaryPages(data);
            if(obj['alerts'].length > 0) {
                if(type == 'html')
                    return '<span title="'+obj['messages'].join(',&#10 ')+
                        '" class=\"infra-nodesatus-text-ellipsis\">'+
                        obj['messages'].join(',')+'</span>';
                else if(type == 'text')
                    return obj['messages'].join(',');
            } else {
                if(type == 'html')
                    return "<span> "+data['status']+"</span>";
                else if(type == 'text')
                    return data['status'];
            }
        }

        /**
         * Util functions to create the footer links in the monitor infra details pages
         */
        /*self.createFooterLinks = function (parent, config) {
            var template = contrail.getTemplate4Id('monitor-footer-links-template');
            $('#monitor-footer-links-template').remove();
            $(parent).append(template(config));
            if(config.onIntrospectClick != null) {
                $('#linkIntrospect').off('click');
                $('#linkIntrospect').click(config.onIntrospectClick);
            }
            if(config.onStatusClick != null) {
                $('#linkStatus').off('click');
                $('#linkStatus').click(config.onStatusClick);
            }
        }*/

        self.getSandeshPostData = function(ip,port,url) {
            var postData;
            var obj = {};
            if(ip != null && ip != ""){
                obj["ip"] = ip;
            } else {
                return null;
            }
            if(port != null && port != ""){
                obj["port"] = port;
            }
            if(url != null && url != ""){
                obj["url"] = url;
            }
            postData = {data:obj};
            return postData;
        }

        self.createMonInfraDetailsFooterLinks = function (parent, ipList, port) {
            var ipDeferredObj = $.Deferred();
            self.getReachableIp(ipList,
                                port,ipDeferredObj);
            ipDeferredObj.done (function (nodeIp) {
                if(nodeIp != null) {
                var leftColumnContainer = '#left-column-container';
                    self.
                        createFooterLinks(parent,
                    [
                      {
                          name:'introspect',
                          onClick: function () {
                                    monitorInfraUtils.
                                        onIntrospectLinkClick(nodeIp,
                                                port);
                                }
                      },
                      {
                          name:'status',
                          onClick : function () {
                                    monitorInfraUtils.
                                        onStatusLinkClick(nodeIp);
                                }
                      }
                    ]);
                }
            });
        };

        self.createFooterLinks = function (parent, config) {
            var template = contrail.
                getTemplate4Id('monitor-infra-details-footer-links-template');
            $('#monitor-infra-details-footer-links-template').remove();
            $(parent).append(template(config));
            $.each(config,function(i,d){
                var linkDiv = '<a id="mon_infra_footer_link_'+
                                d.name +'" class="pull-right" >'+
                                cowl.getFirstCharUpperCase(d.name) +'</a>';
                $(parent).find('.footer-links').append(linkDiv);
                if(d.onClick != null) {
                    $('#mon_infra_footer_link_' + d.name).off('click');
                    $('#mon_infra_footer_link_'  + d.name).click(d.onClick);
                }
            });
        }

        self.onIntrospectLinkClick = function (nodeIp, introspectPort) {
            window.open('/proxy?proxyURL=http://'+nodeIp+':'+ introspectPort +
                    '&indexPage', '_blank');
        }

        self.onStatusLinkClick = function (nodeIp) {
            var loginWindow = new LoginWindowView();
            var leftColumnContainer = '#left-column-container';
            loginWindow.model = new LoginWindowModel();
            loginWindow.renderLoginWindow({
                data:{
                    ip: nodeIp
                },
                callback : function (response) {
                    var htmlString = '<pre>' +
                        response + '</pre>';
                    $('.contrail-status-view')
                        .html(htmlString);
                    $(leftColumnContainer)
                        .find('.widget-box')
                        .find('.list-view').hide();
                    $(leftColumnContainer)
                        .find('.widget-box')
                        .find('.advanced-view').hide();
                    $(leftColumnContainer)
                        .find('.widget-box')
                        .find('.contrail-status-view').show();
                }
            });
        }

        self.getReachableIp = function (ips,port,deferredObj){
            var res;
            if(ips != null && ips.length > 0){
                var postData = self.getPostDataForReachableIpsCall(ips,port);
                $.ajax({
                    url:'/api/service/networking/get-network-reachable-ip',
                    type:'POST',
                    data:postData
                }).done(function(result) {
                    if(result != null && result['ip'] != null){
                        res = result['ip'];
                    }
                    deferredObj.resolve(res);
                }).fail(function(result) {
                    deferredObj.resolve(res);
                });
            }
        }

        self.getControlIpAddresses = function (data,pageType) {
            var ips;
            var configip = noDataStr;
            var ipString = "";
            var isConfigMismatch = true;
            try{
                ips = ifNull(jsonPath(data,'$..bgp_router_ip_list')[0],[]);
                configip = jsonPath(data,'$..ConfigData..bgp_router_parameters.address')[0];
                $.each(ips, function (idx, ip){
                    if(ip == configip){
                        isConfigMismatch = false;
                    }
                    if(idx+1 == ips.length) {
                        ipString = ipString + ip;
                    } else {
                        ipString = ipString + ip + ', ';
                    }
                });
                if(configip != null && isConfigMismatch){
                    if(ipString != ""){
                        ipString += ","
                    }
                    if(pageType == "summary"){
                        ipString = ipString +  configip ;
                    } else if (pageType == "details"){
                        ipString = ipString + "<span class='text-error' title='Config IP mismatch'> "+ configip +"</span>";
                    }
                }
            } catch(e){}
            return ipString;
        }

        self.getDisplayNameForVRouterType = function (type){
            switch (type){
            case 'tor-agent':
                return 'TOR Agent';
            case 'tor-service-node':
                return 'TOR Service Node';
            case 'embedded':
                return 'Embedded';
            case 'hypervisor':
                return 'Hypervisor';
            }
        }

        function onPrevNextClick(obj,cfg) {
            var gridSel = $(cfg['gridSel']);
            if(gridSel.length == 0) {
                return;
            }
            var newAjaxConfig = "";
            var cfg = ifNull(cfg,{});
            var paginationInfo = ifNull(cfg['paginationInfo'],{});
            //Populate last_page based on entries and first_page
            paginationInfo['last_page'] = paginationInfo['first_page'];
            var xStrFormat = /(begin:)\d+(,end:)\d+(,table:.*)/;
            var entriesFormat = /.*\/(\d+)/;
            var totalCnt;
            if(paginationInfo['entries'] != null && paginationInfo['entries'].match(entriesFormat) instanceof Array) {
                var patternResults = paginationInfo['entries'].match(entriesFormat);
                //Get the total count from entries as with some filter applied,total count will not be same as table size
                totalCnt = parseInt(patternResults[1]);
            }
            if(paginationInfo['last_page'] != null && paginationInfo['last_page'].match(xStrFormat) instanceof Array) {
                if(totalCnt == null) {
                    totalCnt = parseInt(paginationInfo['table_size']);
                }
                paginationInfo['last_page'] = paginationInfo['last_page'].replace(xStrFormat,'$1' + (totalCnt - (totalCnt%100)) + '$2' + ((totalCnt - (totalCnt%100)) + 99)+ '$3');
            }
            var getUrlFn = ifNull(cfg['getUrlFn'],$.noop);
            var dirType = ifNull(cfg['dirType'],'');
            var gridInst = gridSel.data('contrailGrid');
            var urlObj = getUrlFn();
            var urlStr = null,xKey = null;
            if(dirType == 'next') {
                xKey = 'next_page';
            } else if(dirType == 'prev') {
                xKey = 'prev_page';
            } else if(dirType == 'first') {
                xKey = 'first_page';
            } else if(dirType == 'last') {
                xKey = 'last_page';
            }
            if(paginationInfo[xKey] != null) {
                urlObj['params']['x'] = paginationInfo[xKey];
            }
            if(typeof(urlObj) == 'object') {
                urlStr = urlObj['url'] + '?' + $.param(urlObj['params']);
            }
            newAjaxConfig = {
                        url: urlStr,
                        type:'Get'
                };
            if(gridInst != null) {
                // gridInst.showGridMessage('loading');
                gridInst.setRemoteAjaxConfig(newAjaxConfig);
                reloadGrid(gridInst);
            }
        }

        self.getIntrospectPaginationInfo = function(response) {
            var paginationInfo = {};
            var paginationInfo = jsonPath(response,'$..Pagination');
            if(paginationInfo instanceof Array && paginationInfo.length > 0) {
                paginationInfo = getValueByJsonPath(paginationInfo,'0;req;PageReqData');
            }
            return paginationInfo;
        }

        self.updateGridTitleWithPagingInfo = function(gridSel,pagingInfo) {
            var gridHeaderTextElem = $(gridSel).find('.grid-header-text');
            var pageInfoTitle = '';
            var entriesText = getValueByJsonPath(pagingInfo,'entries','');
            var extractedData;
            if(typeof(entriesText) == 'string' ) {
                extractedData = entriesText.match(/(\d+)-(\d+)\/(\d+)/);
            }

            if(extractedData instanceof Array) {
                var startCnt = parseInt(extractedData[1]);
                var endCnt = parseInt(extractedData[2]);
                var totalCnt = parseInt(extractedData[3]);
                pageInfoTitle = contrail.format(' ({0} - {1} of {2})',startCnt+1,endCnt+1,totalCnt);
            } else {
                if(pagingInfo != null && pagingInfo['entries'] != null) {
                    pageInfoTitle = ' (' + pagingInfo['entries'] + ')';
                }
            }
            if(gridHeaderTextElem.find('span').length == 0) {
                gridHeaderTextElem.append($('<span>',{}));
            } else {
                gridHeaderTextElem.find('span').text('');
            }
            gridHeaderTextElem.find('span').text(pageInfoTitle);
        }

        self.bindGridPrevNextListeners = function(cfg) {
            var cfg = ifNull(cfg,{});
            var gridSel = cfg['gridSel'];
            var paginationInfo;
            gridSel.find('i.icon-step-forward').parent().click(function() {
                paginationInfo = cfg['paginationInfoFn']();
                //Ignore if already on first page
                if(paginationInfo['last_page'] == '') {
                    return;
                }
                onPrevNextClick(cfg['obj'], {
                    dirType: 'last',
                    gridSel: gridSel,
                    paginationInfo: paginationInfo,
                    getUrlFn: cfg['getUrlFn']
                });
            });
            gridSel.find('i.icon-forward').parent().click(function() {
                paginationInfo = cfg['paginationInfoFn']();
                //Ignore if already on first page
                if(paginationInfo['next_page'] == '') {
                    return;
                }
                onPrevNextClick(cfg['obj'], {
                    dirType: 'next',
                    gridSel: gridSel,
                    paginationInfo: paginationInfo,
                    getUrlFn: cfg['getUrlFn']
                });
            });
            gridSel.find('i.icon-step-backward').parent().click(function() {
                paginationInfo = cfg['paginationInfoFn']();
                //Ignore if already on last page
                if(paginationInfo['first_page'] == '') {
                    return;
                }
                onPrevNextClick(cfg['obj'], {
                    dirType: 'first',
                    gridSel: gridSel,
                    paginationInfo: paginationInfo,
                    getUrlFn: cfg['getUrlFn']
                });
            });
            gridSel.find('i.icon-backward').parent().click(function() {
                paginationInfo = cfg['paginationInfoFn']();
                //Ignore if already on last page
                if(paginationInfo['prev_page'] == '') {
                    return;
                }
                onPrevNextClick(cfg['obj'], {
                    dirType: 'prev',
                    gridSel: gridSel,
                    paginationInfo: paginationInfo,
                    getUrlFn: cfg['getUrlFn']
                });
            });
            gridSel.parent().find('.btn-display').click(function() {
                paginationInfo = cfg['paginationInfoFn']();
                onPrevNextClick(cfg['obj'], {
                    gridSel: gridSel,
                    paginationInfo: paginationInfo,
                    getUrlFn: cfg['getUrlFn']
                });
            });
            gridSel.parent().find('.btn-reset').click(function() {
                cfg['resetFn']();
                onPrevNextClick(cfg['obj'],{
                    gridSel: gridSel,
                    paginationInfo: paginationInfo,
                    getUrlFn: cfg['getUrlFn']
                });
            });
        }
        self.vRouterBubbleSizeFn = function(mergedNodes) {
            return d3.max(mergedNodes,function(d) {
                return d.size;
            });
        },
        self.onvRouterDrillDown = function(currObj) {
            layoutHandler.setURLHashParams({node:currObj['name'], tab:''}, {p:'mon_infra_vrouter'});
        },
        self.onControlNodeDrillDown = function(currObj) {
            layoutHandler.setURLHashParams({node:currObj['name'], tab:''}, {p:'mon_infra_control'});
        },
        self.onAnalyticNodeDrillDown = function(currObj) {
            layoutHandler.setURLHashParams({node:currObj['name'], tab:''}, {p:'mon_infra_analytics'});
        },
        self.onConfigNodeDrillDown = function(currObj) {
            layoutHandler.setURLHashParams({node:currObj['name'], tab:''}, {p:'mon_infra_config'});
        },
        self.onDbNodeDrillDown = function(currObj) {
            layoutHandler.setURLHashParams({node:currObj['name'], tab:''}, {p:'mon_infra_database'});
        },
        self.vRouterTooltipFn = function(currObj,formatType) {
            if(currObj['children'] != null && currObj['children'].length == 1)
                return getNodeTooltipContents(currObj['children'][0],formatType);
            else
                return getNodeTooltipContents(currObj,formatType);
        },
        self.vRouterBucketTooltipFn = function(currObj,formatType) {
            return getNodeTooltipContentsForBucket(currObj,formatType);
        },
        self.controlNodetooltipFn = function(currObj,formatType) {
            return getNodeTooltipContents(currObj,formatType);
        },
        self.analyticNodeTooltipFn = function(currObj,formatType) {
            var tooltipContents = [];
            if(currObj['pendingQueryCnt'] != null && currObj['pendingQueryCnt'] > 0)
                tooltipContents.push({label:'Pending Queries', value:currObj['pendingQueryCnt']});
            return getNodeTooltipContents(currObj,formatType).concat(tooltipContents);
        },
        self.configNodeTooltipFn = function(currObj,formatType) {
            return getNodeTooltipContents(currObj,formatType);
        },
        self.dbNodeTooltipFn = function(currObj,formatType) {
            return getDbNodeTooltipContents(currObj,formatType);
        },

        //Start: Handlebar register helpers
        Handlebars.registerPartial('statusTemplate',$('#statusTemplate').html());

        Handlebars.registerHelper('renderStatusTemplate', function(sevLevel, options) {
            var selector = '#statusTemplate',
                source = $(selector).html(),
                html = Handlebars.compile(source)({sevLevel:sevLevel,sevLevels:sevLevels});
            return new Handlebars.SafeString(html);
        });

        Handlebars.registerHelper('getInfraDetailsPageCPUChartTitle',function() {
            return infraDetailsPageCPUChartTitle;
        })

        //End: Handlebar register helpers
        self.getMaxGeneratorValueInArray = function (inputArray,selector) {
            var maxVal;
            if(inputArray != null && inputArray['length'] != null && inputArray['length'] > 0) {
                maxVal = inputArray[0];
                for(var i = 1; i < inputArray.length; i++){
                    var curSelectorVal = jsonPath(inputArray[i],"$.."+selector)[0];
                    var maxSelectorVal = jsonPath(maxVal,"$.."+selector)[0];
                    if(curSelectorVal > maxSelectorVal){
                        maxVal = inputArray[i];
                    }
                }
                return maxVal;
            } else {
                return inputArray;
            }
        }

        self.getPostDataForCpuMemStatsQuery = function (options) {
            var dsName = options.nodeType,
                moduleType = options.moduleType,
                node = options.node;
            var postData = {
                    pageSize:50,
                    page:1,
//                    timeRange:600,
                    tgUnits:'secs',
                    fromTimeUTC:'now-2h',
                    toTimeUTC:'now',
                    async:true,
                    queryId:randomUUID(),
                    reRunTimeRange:600,
                    select:'Source, T, cpu_info.cpu_share, cpu_info.mem_res, cpu_info.module_id',
                    groupFields:['Source'],
                    plotFields:['cpu_info.cpu_share']
            }

            if (dsName == monitorInfraConstants.CONTROL_NODE) {
                postData['table'] = 'StatTable.ControlCpuState.cpu_info';
                if (moduleType != null && moduleType != '') {
                    postData['where'] = '(Source = '+ node +' AND cpu_info.module_id = contrail-control)';
                } else {
                    postData['where'] = '(cpu_info.module_id = contrail-control)';
                }
            } else if (dsName == monitorInfraConstants.COMPUTE_NODE) {
                postData['table'] = 'StatTable.ComputeCpuState.cpu_info';
                if (moduleType != null && moduleType != '') {
                    if(moduleType == 'vRouterAgent') {
                        postData['select'] = 'Source, T, cpu_info.cpu_share, cpu_info.mem_res';
                    } else if (moduleType == 'vRouterSystem') {
                        postData['select'] = 'Source, T, cpu_info.one_min_cpuload, cpu_info.used_sys_mem';
                    }
                    postData['where'] = '(Source = '+ node +')';
                } else {
                    postData['select'] = 'Source, T, cpu_info.cpu_share, cpu_info.mem_res';
                    postData['where'] = '';
                }
            } else if (dsName == monitorInfraConstants.ANALYTICS_NODE) {
                postData['table'] = 'StatTable.AnalyticsCpuState.cpu_info';
                postData['select'] = 'Source, T, cpu_info.cpu_share, cpu_info.mem_res';
                if (moduleType != null && moduleType != '') {
                    if(moduleType == 'analyticsCollector') {
                        postData['where'] = '(Source = '+ node +' AND cpu_info.module_id = contrail-collector)';
                    } else if (moduleType == 'analyticsQE') {
                        postData['where'] = '(Source = '+ node +' AND cpu_info.module_id = contrail-query-engine)';
                    } else if (moduleType == 'analyticsAnalytics') {
                        postData['where'] = '(Source = '+ node +' AND cpu_info.module_id = contrail-analytics-api)';
                    }
                } else {
                    postData['where'] = '(cpu_info.module_id = contrail-collector)';
                }
            } else if (dsName == monitorInfraConstants.CONFIG_NODE) {
                postData['table'] = 'StatTable.ConfigCpuState.cpu_info';
                if (moduleType != null && moduleType != '') {
                    if(moduleType == 'configAPIServer') {
                        postData['where'] = '(Source = '+ node +' AND cpu_info.module_id = contrail-api)';
                    } else if (moduleType == 'configServiceMonitor') {
                        postData['where'] = '(Source = '+ node +' AND cpu_info.module_id = contrail-svc-monitor)';
                    } else if (moduleType == 'configSchema') {
                        postData['where'] = '(Source = '+ node +' AND cpu_info.module_id = contrail-schema)';
                    }
                } else {
                    postData['where'] = '(cpu_info.module_id = contrail-api)';
                }
            } else if (dsName == monitorInfraConstants.DATABASE_NODE) {
                postData['table'] = 'StatTable.DatabaseUsageInfo.database_usage';
                postData['select'] = 'Source, T, database_usage.disk_space_used_1k, database_usage.analytics_db_size_1k';
                postData['plotFields'] = 'database_usage.disk_space_used_1k';
                postData['where'] = '(Source = '+ node +')';
            }
            return postData;
        }
        self.getComputeNodeDetails = function(deferredObj,hostname) {
            $.ajax({
                url: contrail.format(monitorInfraConstants.monitorInfraUrls['VROUTER_DETAILS'] , hostname,true)
            }).done(function(result) {
                deferredObj.resolve(result);
            });
        }
        self.getIPOrHostName = function(obj) {
            return (obj['ip'] == noDataStr) ? obj['name'] : obj['ip'];
        }

    };
    return MonitorInfraUtils;
});