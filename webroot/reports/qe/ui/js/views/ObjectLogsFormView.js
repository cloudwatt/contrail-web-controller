/*
 * Copyright (c) 2014 Juniper Networks, Inc. All rights reserved.
 */

define([
    'underscore',
    'query-form-view',
    'knockback',
    'reports/qe/ui/js/models/ObjectLogsFormModel'
], function (_, QueryFormView, Knockback, ObjectLogsFormModel) {

    var ObjectLogsFormView = QueryFormView.extend({
        render: function () {
            var self = this,
                viewConfig = self.attributes.viewConfig,
                queryPageTmpl = contrail.getTemplate4Id(ctwc.TMPL_QUERY_PAGE),
                modelMap = contrail.handleIfNull(self.modelMap, {}),
                hashParams = layoutHandler.getURLHashParams(),
                queryPageTmpl = contrail.getTemplate4Id(ctwc.TMPL_QUERY_PAGE),
                queryType = contrail.checkIfExist(hashParams.queryType) ? hashParams.queryType : null,
                queryFormAttributes = contrail.checkIfExist(hashParams.queryFormAttributes) ? hashParams.queryFormAttributes : {},
                objectLogsQueryFormModel = new ObjectLogsFormModel(queryFormAttributes),
                widgetConfig = contrail.checkIfExist(viewConfig.widgetConfig) ? viewConfig.widgetConfig : null,
                queryFormId = cowc.QE_HASH_ELEMENT_PREFIX + cowc.OBJECT_LOGS_PREFIX + cowc.QE_FORM_SUFFIX,
                objectLogsId = cowl.QE_OBJECT_LOGS_ID;

            self.model = objectLogsQueryFormModel;
            self.$el.append(queryPageTmpl({queryPrefix: cowc.OBJECT_LOGS_PREFIX }));

            if (queryType === cowc.QUERY_TYPE_MODIFY) {
                self.model.from_time(parseInt(queryFormAttributes.from_time));
                self.model.to_time(parseInt(queryFormAttributes.to_time));
            }

            self.renderView4Config($(self.$el).find(queryFormId), this.model, self.getViewConfig(), null, null, modelMap, function () {
                self.model.showErrorAttr(objectLogsId, false);
                Knockback.applyBindings(self.model, document.getElementById(objectLogsId));
                kbValidation.bind(self);
                $("#run_query").on('click', function() {
                    if (self.model.model().isValid(true, 'runQueryValidation')) {
                        self.renderQueryResult();
                    }
                });

                qewu.adjustHeight4FormTextarea(self.$el);

                if (queryType === cowc.QUERY_TYPE_RERUN) {
                    self.renderQueryResult();
                }
            });

            if (widgetConfig !== null) {
                self.renderView4Config($(queryFormId), self.model, widgetConfig, null, null, null);
            }
        },

        renderQueryResult: function() {
            var self = this,
                viewConfig = self.attributes.viewConfig,
                widgetConfig = contrail.checkIfExist(viewConfig.widgetConfig) ? viewConfig.widgetConfig : null,
                modelMap = contrail.handleIfNull(self.modelMap, {}),
                queryFormModel = self.model,
                queryFormId = cowc.QE_HASH_ELEMENT_PREFIX + cowc.OBJECT_LOGS_PREFIX + cowc.QE_FORM_SUFFIX,
                queryResultId = cowc.QE_HASH_ELEMENT_PREFIX + cowc.OBJECT_LOGS_PREFIX + cowc.QE_RESULTS_SUFFIX,
                queryResultTabId = cowl.QE_OBJECT_LOGS_TAB_ID;

            if (widgetConfig !== null) {
                $(queryFormId).parents('.widget-box').data('widget-action').collapse();
            }

            queryFormModel.is_request_in_progress(true);
            qewu.fetchServerCurrentTime(function(serverCurrentTime) {
                var timeRange = parseInt(queryFormModel.time_range()),
                    queryResultPostData;

                if (timeRange !== -1) {
                    queryFormModel.to_time(serverCurrentTime);
                    queryFormModel.from_time(serverCurrentTime - (timeRange * 1000));
                }

                queryResultPostData = queryFormModel.getQueryRequestPostData(serverCurrentTime);

                self.renderView4Config($(queryResultId), self.model,
                    getQueryResultTabViewConfig(queryResultPostData, queryResultTabId), null, null, modelMap,
                    function() {
                        var queryResultListModel = modelMap[cowc.UMID_QUERY_RESULT_LIST_MODEL];

                        queryResultListModel.onAllRequestsComplete.subscribe(function () {
                            queryFormModel.is_request_in_progress(false);
                        });
                    });
            });
        },

        getViewConfig: function () {
            var self = this;

            return {
                view: "SectionView",
                viewConfig: {
                    rows: [
                        {
                            columns: [
                                {
                                    elementId: 'table_name', view: "FormComboboxView",
                                    viewConfig: {
                                        path: 'table_name', dataBindValue: 'table_name', class: "span3",
                                        elementConfig: {
                                            defaultValueId: 0, allowClear: false, placeholder: cowl.QE_SELECT_OBJECT_TABLE,
                                            dataTextField: "name", dataValueField: "name",
                                            dataSource: {
                                                type: 'remote', url: cowc.URL_TABLES, parse: function (response) {
                                                    var parsedOptionList = [];
                                                    for(var i = 0; i < response.length; i++) {
                                                        if(response[i].type == 'OBJECT') {
                                                            parsedOptionList.push(response[i]);
                                                        }
                                                    }
                                                    return parsedOptionList;
                                                }
                                            }
                                        }
                                    }
                                }
                            ]
                        },
                        {
                            columns: [
                                {
                                    elementId: 'time_range', view: "FormDropdownView",
                                    viewConfig: {
                                        path: 'time_range', dataBindValue: 'time_range', class: "span3",
                                        elementConfig: {dataTextField: "text", dataValueField: "id", data: cowc.TIMERANGE_DROPDOWN_VALUES}}
                                },
                                {
                                    elementId: 'from_time', view: "FormDateTimePickerView",
                                    viewConfig: {
                                        style: 'display: none;',
                                        path: 'from_time', dataBindValue: 'from_time', class: "span3",
                                        elementConfig: qewu.getFromTimeElementConfig('from_time', 'to_time'),
                                        visible: "time_range() == -1"
                                    }
                                },
                                {
                                    elementId: 'to_time', view: "FormDateTimePickerView",
                                    viewConfig: {
                                        style: 'display: none;',
                                        path: 'to_time', dataBindValue: 'to_time', class: "span3",
                                        elementConfig: qewu.getToTimeElementConfig('from_time', 'to_time'),
                                        visible: "time_range() == -1"
                                    }
                                }
                            ]
                        },
                        {
                            columns: [
                                {
                                    elementId: 'select', view: "FormTextAreaView",
                                    viewConfig: {
                                        path: 'select', dataBindValue: 'select', class: "span9",
                                        visible: 'isTableNameAvailable()',
                                        editPopupConfig: {
                                            renderEditFn: function() {
                                                var tableName = self.model.table_name();
                                                self.renderSelect({className: qewu.getModalClass4Table(tableName)});
                                            }
                                        }
                                    }
                                }
                            ]
                        },
                        {
                            columns: [
                                {
                                    elementId: 'where', view: "FormTextAreaView",
                                    viewConfig: {
                                        path: 'where', dataBindValue: 'where', class: "span9", placeHolder: "*",
                                        visible: 'isTableNameAvailable()',
                                        editPopupConfig: {
                                            renderEditFn: function() {
                                                self.renderWhere({className: cowc.QE_MODAL_CLASS_700});
                                            }
                                        }
                                    }
                                }
                            ]
                        },
                        {
                            columns: [
                                {
                                    elementId: 'filters', view: "FormTextAreaView",
                                    viewConfig: {
                                        path: 'filters', dataBindValue: 'filters', class: "span9",
                                        visible: 'isTableNameAvailable()',
                                        editPopupConfig: {
                                            renderEditFn: function() {
                                                self.renderFilters({className: cowc.QE_MODAL_CLASS_700});
                                            }
                                        }
                                    }
                                }
                            ]
                        },
                        {
                            columns: [
                                {
                                    elementId: 'run_query', view: "FormButtonView", label: "Run Query",
                                    viewConfig: {
                                        class: 'display-inline-block margin-0-10-0-0',
                                        disabled: 'is_request_in_progress()',
                                        elementConfig: {
                                            btnClass: 'btn-primary'
                                        }
                                    }
                                },
                                {
                                    elementId: 'reset_query', view: "FormButtonView", label: "Reset",
                                    viewConfig: {
                                        label: "Reset",
                                        class: 'display-inline-block margin-0-10-0-0',
                                        elementConfig: {
                                            onClick: "reset"
                                        }
                                    }
                                }
                            ]
                        }
                    ]
                }
            };
        }
    });

    function getQueryResultTabViewConfig(queryResultPostData, queryResultTabId) {
        return {
            elementId: queryResultTabId,
            view: "TabsView",
            viewConfig: {
                theme: cowc.TAB_THEME_WIDGET_CLASSIC,
                tabs: [getQueryResultGridViewConfig(queryResultPostData)]
            }
        };
    }

    function getQueryResultGridViewConfig(queryResultPostData) {
        return {
            elementId: cowl.QE_QUERY_RESULT_GRID_ID,
            title: cowl.TITLE_RESULTS,
            iconClass: 'icon-table',
            view: 'QueryResultGridView',
            tabConfig: {
                //TODO
            },
            viewConfig: {
                queryResultPostData: queryResultPostData,
                gridOptions: {
                    titleText: cowl.TITLE_OBJECT_LOGS,
                    queryQueueUrl: cowc.URL_QUERY_LOG_QUEUE,
                    queryQueueTitle: cowl.TITLE_LOG,
                    fixedRowHeight: false
                }
            }
        }
    }

    return ObjectLogsFormView;
});