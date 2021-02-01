angular.module('app.debugger', [])
    .controller(
        'DebuggerController',
        [
            '$scope',
            function ($scope) {

                const DEFAULTS = {
                    colours: {
                        failureNode: "#f8c291",
                        traversedNode: "#16a085",
                        traversableNode: "#1abc9c",
                        unTraversableNode: "#e74c3c"
                    },
                    invisibleNode: { IDENTIFIER: "", IS_PADDING_NODE: true },
                    maxTries:  1,
                    rootNode: {IDENTIFIER: "[My Agent]"},
                    states: {
                        action: "ACTION",
                        planNotFound: "PLAN_NOT_FOUND",
                        planSelection: "PLAN_SELECTION",
                        planTrace: "PLAN_TRACE",
                        sense: "SENSE"
                    }
                }

                const INITIAL_STATE = {
                    agents: {all: ["Alice", "Bond", "Derek"], selected: "N/A"},
                    agentHistory: {
                        activities: DEFAULTS.rootNode,
                        beliefs: {},
                        branch: null,
                        currentNode: null,
                        lastNode: null,
                        removedBeliefs: {},
                        selectedNode: null

                    },
                    history: {},
                }

                const app = require('express')();               // required for server...
                const bodyParser = require('body-parser');      // required for parsing JSON payloads...
                const http = require('http').createServer(app); // required for server...


                var vm = this;          // view model
                vm.agents = {...INITIAL_STATE.agents};
                vm.autoscroll = true;
                vm.history = {...INITIAL_STATE.history};
                vm.isRunning = false;   //debugger status
                vm.selectedAgent = "";


                /** D3 vars **/
                $scope.currentSequence = 0;
                var diagonal,
                    div,
                    duration = 750,
                    margin = {top: 20, right: 10, bottom: 20, left: 10},
                    height = 370 - margin.top - margin.bottom,
                    i = 0,
                    poll,
                    root,
                    sessionTag = "",
                    svg,
                    tree,
                    tries = 0,
                    width =  10000000;

                /**
                 * vm.initialise
                 * Initialises the debugger....
                 *
                 */
                vm.initialise = function () {
                    setupRestApi();
                }

                /**
                 * Changes the Agent being visualised.
                 *
                 * @param agent Agent Name
                 */
                vm.selectAgent = function (agent) {
                    vm.agents.selected = agent;
                }

                vm.toggleAutoscroll = function () {
                    vm.autoscroll =  ! vm.autoscroll;
                }
                /**
                 * Toggles the Debugger's state
                 */
                vm.toggleDebugging = function() {
                    if (vm.isRunning) {
                        stop();
                    } else {
                        vm.initialise();
                        start();
                    }
                    vm.isRunning =  ! vm.isRunning;
                }



                /**
                 * setupRestApi
                 *
                 * Sets up the REST API through which client
                 * apps post data
                 */
                function setupRestApi () {
                    app.post('/log', (req, res) => {
                        // inform client that request has been received
                        res.send();
                        // handle request
                        onStateReceived(req.body);
                    });
                }

                /**
                 * start
                 * Starts the debug server....
                 */
                function start() {
                    http.listen(3000, () => {
                        console.log("Listening on 3000...");
                        $scope.isRunning = true;
                    });
                }

                /**
                 * stop
                 * Stops the debug server...
                 */
                function stop() {
                    http.close();
                    $scope.isRunning = false;
                }


                /**
                 * onStateReceived
                 * Handles new state received from the agents...
                 *
                 * @param state Agent state object
                 */
                function onStateReceived (state) {
                    // drop invalid logs...
                    if (state.TYPE_INFO === undefined) { return; }
                    // identify agent
                    const concernedAgent =  state.AGENT;
                    // ensure agent is known and has a history cache...
                    if (vm.history[concernedAgent] === undefined) {
                        vm.history[concernedAgent] = _.cloneDeep(INITIAL_STATE.agentHistory);
                        vm.history[concernedAgent].activities["IDENTIFIER"] = concernedAgent;
                        vm.history[concernedAgent].current = vm.history[concernedAgent].activities;
                        vm.agents.all.push(concernedAgent);
                    }
                    // visualise the agent if currently not visualising any agent...
                    // this helps us to ensure we have to do nothing on first launch.
                    if (vm.agents.current === null) {
                        vm.agents.current = concernedAgent;
                    }
                    // mutate the object.....
                    state.TYPE_INFO.SEQUENCE_NUMBER =  state.SEQUENCE_NUMBER;
                    state.TYPE_INFO.AGENT = state.AGENT;

                    switch (state.TYPE) {
                        case DEFAULTS.states.action:
                            logAction(state);
                            break;
                        case DEFAULTS.states.sense:
                            logSense(state);
                            break;
                        case DEFAULTS.states.planSelection:
                            logPlanSelection(state);
                            break;
                        case DEFAULTS.states.planTrace:
                            logPlanTrace(state);
                            break;
                        case DEFAULTS.states.planNotFound:
                            logPlanNotFound(state);
                            break;
                        default:    // there is nothing to do...
                            return;
                    }

                    // update the visualisation if we are currently looking at
                    // the agent with the state update...
                    if (vm.agents.current === state.AGENT) {
                        updateChart(state.AGENT);
                    }

                }


            }
        ]
    )