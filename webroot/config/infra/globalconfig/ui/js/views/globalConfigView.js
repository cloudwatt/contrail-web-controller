/*
 * Copyright (c) 2015 Juniper Networks, Inc. All rights reserved.
 */

define([
    'underscore',
    'contrail-view'
], function (_, ContrailView) {
    var globalConfigView = ContrailView.extend({
        el: $(contentContainer),
        renderGlobalConfig: function (viewConfig) {
            var self = this;
            self.renderView4Config(self.$el, null, getGlobalConfig(viewConfig));
        }
    });

    function getGlobalConfig(viewConfig){
        return {
            elementId: cowu.formatElementId([ctwl.CONFIG_GLOBAL_CONFIG_PAGE_ID]),
            view: "SectionView",
            viewConfig: {
                rows: [{
                    columns: [{
                        elementId: ctwc.GLOBAL_CONFIG_TAB_ID,
                        view: 'TabsView',
                        viewConfig: getGlobalConfigTabs(viewConfig)
                    }]
                }]
            }
        };
    };

    function getGlobalConfigTabs(viewConfig) {
        return {
            theme: 'default',
            active: 0,
            tabs: [{
               elementId: 'forwarding_options_tab',
               title: 'Forwarding Options',
               view: "forwardingOptionsListView",
               viewPathPrefix: "config/infra/globalconfig/ui/js/views/",
               viewConfig: viewConfig,
               tabConfig: {
                   activate: function(event, ui) {
                       var gridId = $('#' + ctwc.GLOBAL_FORWARDING_OPTIONS_GRID_ID);
                       if (gridId.data('contrailGrid')) {
                           gridId.data('contrailGrid').refreshView();
                       }
                   }
               }
           },{
               elementId: 'bgp_options_tab',
               title: 'BGP Options',
               view: "bgpOptionsListView",
               viewPathPrefix: "config/infra/globalconfig/ui/js/views/",
               viewConfig: viewConfig,
               tabConfig: {
                   activate: function(event, ui) {
                       var gridId = $('#' + ctwc.GLOBAL_BGP_OPTIONS_GRID_ID);
                       if (gridId.data('contrailGrid')) {
                           gridId.data('contrailGrid').refreshView();
                       }
                   },
                   renderOnActivate: true
               }
           },{
               elementId: 'flow_aging_tab',
               title: 'Flow Aging',
               view: "flowAgingListView",
               viewPathPrefix: "config/infra/globalconfig/ui/js/views/",
               viewConfig: viewConfig,
               tabConfig: {
                   activate: function(event, ui) {
                       var gridId = $('#' + ctwc.GLOBAL_FLOW_OPTIONS_GRID_ID);
                       if (gridId.data('contrailGrid')) {
                           gridId.data('contrailGrid').refreshView();
                       }
                   },
                   renderOnActivate: true
               }
           }]
        };
    };
    return globalConfigView;
});
