/*
 * Copyright (c) 2015 Juniper Networks, Inc. All rights reserved.
 */

define([
    'contrail-list-model'
], function (ContrailListModel) {
    var ControlNodeListModel = function () {
        var vlRemoteConfig = [
          {
              getAjaxConfig: function() {
                  return monitorInfraUtils
                      .getGeneratorsAjaxConfigForInfraNodes('controlNodeDS');
              },
              successCallback: function(response,contrailListModel) {
                  monitorInfraUtils
                      .parseAndMergeGeneratorWithPrimaryDataForInfraNodes(
                              response,contrailListModel);
              }
          },
          {
              getAjaxConfig: function(responseJSON) {
                  return monitorInfraUtils.getAjaxConfigForInfraNodesCpuStats(
                          monitorInfraConstants.CONTROL_NODE,responseJSON,'summary');
              },
              successCallback: function(response, contrailListModel) {
                  monitorInfraUtils.parseAndMergeCpuStatsWithPrimaryDataForInfraNodes(
                  response, contrailListModel);
              }
          }
        ];
        var listModelConfig = {
                remote : {
                    ajaxConfig : {
                        url : ctwl.CONTROLNODE_SUMMARY_URL
                    },
                    dataParser : monitorInfraParsers.parseControlNodesDashboardData
                },
                vlRemoteConfig :{
                    vlRemoteList : vlRemoteConfig
                },
                cacheConfig : {
                    ucid: ctwc.CACHE_CONTROLNODE
                }
            };
        return new ContrailListModel(listModelConfig);
    };
    return ControlNodeListModel;
    }
);
