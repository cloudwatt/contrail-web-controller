/*
 * Copyright (c) 2014 Juniper Networks, Inc. All rights reserved.
 */
/*jshint node:true */
module.exports = function (grunt) {
    grunt.loadNpmTasks("grunt-contrib-jshint");
    grunt.loadNpmTasks("grunt-contrib-qunit");
    grunt.loadNpmTasks('grunt-qunit-junit');
    grunt.loadNpmTasks('grunt-karma');
    //this option is to avoid interruption of test case execution on failure of one in sequence
    //grunt.option('force',true);
    grunt.option('stack', true);

    var commonFiles = [
        {pattern: 'contrail-web-core/webroot/assets/**/!(tests)/*.js', included: false},

        {pattern: 'contrail-web-core/webroot/assets/**/*.css', included: false},
        {pattern: 'contrail-web-core/webroot/css/**/*.css', included: false},
        {pattern: 'contrail-web-core/webroot/css/**/*.ttf', included: false},
        {pattern: 'contrail-web-core/webroot/css/**/*.woff', included: false},
        {pattern: 'contrail-web-core/webroot/test/ui/**/*.css', included: false},

        {pattern: 'contrail-web-core/webroot/assets/**/*.woff', included: false},
        {pattern: 'contrail-web-core/webroot/assets/**/*.ttf', included: false},

        {pattern: 'contrail-web-core/webroot/img/**/*.png', included: false},
        {pattern: 'contrail-web-core/webroot/css/**/*.png', included: false},
        {pattern: 'contrail-web-core/webroot/assets/select2/styles/**/*.png', included: false},
        {pattern: 'contrail-web-core/webroot/css/**/*.gif', included: false},

        //Everything except library test suites and test files.
        {pattern: 'contrail-web-core/webroot/test/ui/js/**/{!(*.test.js), !(*.lib.test.suite.js)}', included: false},

        {pattern: 'contrail-web-controller/webroot/test/ui/ct.test.app.js'},
        {pattern: 'contrail-web-controller/webroot/test/ui/*.js', included: false},
        {pattern: 'contrail-web-controller/webroot/monitor/**/*.tmpl', included: false},
        {pattern: 'contrail-web-controller/webroot/common/ui/templates/*.tmpl', included: false},
        {pattern: 'contrail-web-controller/webroot/common/**/*.js', included: false},

        {pattern: 'contrail-web-controller/webroot/monitor/networking/ui/js/**/*.js', included: false},

        {pattern: 'contrail-web-controller/webroot/config/linklocalservices/**/*.js', included: false},
        {pattern: 'contrail-web-controller/webroot/*.xml', included: false},

        {pattern: 'contrail-web-core/webroot/js/**/*.js', included: false},
        {pattern: 'contrail-web-core/webroot/templates/*.tmpl', included: false},

        {pattern: 'contrail-web-controller/webroot/monitor/networking/ui/test/ui/*.mock.data.js', included: false}
    ];
    var karmaConfig = {
        options: {
            configFile: 'karma.config.js'
        },
        networkListView: {
            options: {
                files: [
                    {pattern: 'contrail-web-controller/webroot/monitor/networking/ui/test/ui/NetworkListView.test.js', included: false},
                    {pattern: 'contrail-web-controller/webroot/monitor/networking/ui/test/ui/NetworkListView.custom.test.suite.js', included: false}
                ],
                preprocessors: {
                    'contrail-web-controller/webroot/monitor/networking/ui/js/**/*.js': ['coverage']
                },
                junitReporter: {
                    outputFile: __dirname + '/reports/network-list-view-test-results.xml',
                    suite: 'networkListView'
                },
                htmlReporter: {
                    outputFile: __dirname + '/reports/network-list-view-test-results.html'
                },
                coverageReporter: {
                    type : 'html',
                    dir : __dirname + '/reports/coverage/networkListView/'
                }
            }
        },
        networkView: {
            options: {
                files: [
                    {pattern: 'contrail-web-controller/webroot/monitor/networking/ui/test/ui/NetworkView.test.js', included: false}
                ],
                preprocessors: {
                    'contrail-web-controller/webroot/monitor/networking/ui/js/**/*.js': ['coverage']
                },
                junitReporter: {
                    outputFile: __dirname + '/reports/network-view-test-results.xml',
                    suite: 'networkView'
                },
                htmlReporter: {
                    outputFile: __dirname + '/reports/network-view-test-results.html'
                },
                coverageReporter: {
                    type : 'html',
                    dir : __dirname + '/reports/coverage/networkView/'
                }
            }
        },
        projectListView: {
            options: {
                files: [
                    {pattern: 'contrail-web-controller/webroot/monitor/networking/ui/test/ui/ProjectListView.test.js', included: false}
                ],
                preprocessors: {
                    'contrail-web-controller/webroot/monitor/networking/ui/js/**/*.js': ['coverage']
                },
                junitReporter: {
                    outputFile: __dirname + '/reports/project-list-view-test-results.xml',
                    suite: 'projectListView'
                },
                htmlReporter: {
                    outputFile: __dirname + '/reports/project-list-view-test-results.html'
                },
                coverageReporter: {
                    type : 'html',
                    dir : __dirname + '/reports/coverage/projectListView/'
                }
            }
        },
        projectView: {
            options: {
                files: [
                    {pattern: 'contrail-web-controller/webroot/monitor/networking/ui/test/ui/ProjectView.test.js', included: false}
                ],
                preprocessors: {
                    'contrail-web-controller/webroot/monitor/networking/ui/js/**/*.js': ['coverage']
                },
                junitReporter: {
                    outputFile: __dirname + '/reports/project-view-test-results.xml',
                    suite: 'projectView'
                },
                htmlReporter: {
                    outputFile: __dirname + '/reports/project-view-test-results.html'
                },
                coverageReporter: {
                    type : 'html',
                    dir : __dirname + '/reports/coverage/projectView/'
                }
            }
        },
        dashBoardView: {
            options: {
                files: [
                    {pattern: 'contrail-web-controller/webroot/monitor/networking/ui/test/ui/DashboardView.test.js', included: false}
                ],
                preprocessors: {
                    'contrail-web-controller/webroot/monitor/networking/ui/js/**/*.js': ['coverage']
                },
                junitReporter: {
                    outputFile: __dirname + '/reports/dashBoard-view-test-results.xml',
                    suite: 'dashBoardView'
                },
                htmlReporter: {
                    outputFile: __dirname + '/reports/dashBoard-view-test-results.html'
                },
                coverageReporter: {
                    type : 'html',
                    dir : __dirname + '/reports/coverage/dashBoardView/'
                }
            }
        },
        instanceListView: {
            options: {
                files: [
                    {pattern: 'contrail-web-controller/webroot/monitor/networking/ui/test/ui/InstanceListView.test.js', included: false}
                ],
                preprocessors: {
                    'contrail-web-controller/webroot/monitor/networking/ui/js/**/*.js': ['coverage']
                },
                junitReporter: {
                    outputFile: __dirname + '/reports/instance-list-view-test-results.xml',
                    suite: 'instanceListView',
                },
                htmlReporter: {
                    outputFile: __dirname + '/reports/instance-list-view-test-results.html'
                },
                coverageReporter: {
                    type : 'html',
                    dir : __dirname + '/reports/coverage/instanceListView/'
                }
            }
        },
        flowListView: {
            options: {
                files: [
                    {pattern: 'contrail-web-controller/webroot/monitor/networking/ui/test/ui/FlowListView.test.js', included: false}
                ],
                preprocessors: {
                    'contrail-web-controller/webroot/monitor/networking/ui/js/**/*.js': ['coverage']
                },
                junitReporter: {
                    outputFile: __dirname + '/reports/flow-list-view-test-results.xml',
                    suite: 'FlowListView',
                },
                htmlReporter: {
                    outputFile: __dirname + '/reports/flow-list-view-test-results.html'
                },
                coverageReporter: {
                    type : 'html',
                    dir : __dirname + '/reports/coverage/flowListView/'
                }
            }
        },
        flowGridView: {
            options: {
                files: [
                    {pattern: 'contrail-web-controller/webroot/monitor/networking/ui/test/ui/FlowGridView.test.js', included: false}
                ],
                preprocessors: {
                    'contrail-web-controller/webroot/monitor/networking/ui/js/**/*.js': ['coverage']
                },
                junitReporter: {
                    outputFile: __dirname + '/reports/flow-grid-view-test-results.xml',
                    suite: 'FlowGridView',
                },
                htmlReporter: {
                    outputFile: __dirname + '/reports/flow-grid-view-test-results.html'
                },
                coverageReporter: {
                    type : 'html',
                    dir : __dirname + '/reports/coverage/flowGridView/'
                }
            }
        },
        instanceView: {
            options: {
                files: [
                    {pattern: 'contrail-web-controller/webroot/monitor/networking/ui/test/ui/InstanceView.test.js', included: false}
                ],
                preprocessors: {
                    'contrail-web-controller/webroot/monitor/networking/ui/js/**/*.js': ['coverage']
                },
                junitReporter: {
                    outputFile: __dirname + '/reports/instance-view-test-results.xml',
                    suite: 'InstanceView',
                },
                htmlReporter: {
                    outputFile: __dirname + '/reports/instance-view-test-results.html'
                },
                coverageReporter: {
                    type : 'html',
                    dir : __dirname + '/reports/coverage/InstanceView/'
                }
            }
        }
    };

    for (var feature in karmaConfig) {
        if (feature != 'options') {
            karmaConfig[feature]['options']['files'] = commonFiles.concat(karmaConfig[feature]['options']['files']);
        }
    }

    grunt.initConfig({
        pkg: grunt.file.readJSON(__dirname + "/../../../../contrail-web-core/package.json"),
        karma: karmaConfig,
        jshint: {
            options: {
                jshintrc: ".jshintrc"
            },
            files: ["Gruntfile.js"]
        },
        nm : {
            networkListView : 'networkListView',
            networkView     : 'networkView',
            projectListView : 'projectListView',
            projectView     : 'projectView',
            dashBoardView   : 'dashBoardView',
            instanceListView: 'instanceListView',
            instanceView    : 'instanceView',
            flowListView    : 'flowListView',
            flowGridView    : 'flowGridView'
        }
    });

    grunt.registerMultiTask('nm', 'Network Monitoring Test Cases', function () {
        if (this.target == 'networkListView') {
            grunt.task.run('karma:networkListView');
        } else if (this.target == 'networkView') {
            grunt.task.run('karma:networkView');
        } else if (this.target == 'projectListView') {
            grunt.task.run('karma:projectListView');
        } else if (this.target == 'projectView') {
            grunt.task.run('karma:projectView');
        } else if (this.target == 'dashBoardView') {
            grunt.task.run('karma:dashBoardView');
        } else if (this.target == 'instanceListView') {
            grunt.task.run('karma:instanceListView');
        } else if (this.target == 'instanceView') {
            grunt.task.run('karma:instanceView');
        } else if (this.target == 'flowListView') {
            // TODO :- Request returns unexpected token 'u error
            //grunt.task.run('karma:flowListView');
        } else if (this.target == 'flowGridView') {
            // TODO :- Request returns unexpected token 'u error
            //grunt.task.run('karma:flowGridView');
        }
    });
};