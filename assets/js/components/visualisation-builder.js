/**
 * @author: Fahid RM
 * @name: Visualisation Service
 * @desc: A datastore for the visualisation data received and the graphs produced therefrom.
 *        The architectural choice for this was to ensure we can access the same data from
 *        another instance of our controller (another tab or browser window)
 *
 *        This serves as a central point of access....
 *
 */


angular.module('app.data', [])
    .factory(
        'VisualisationService',
        [
            '$rootScope', 'UtilityService',
            function ($rootScope, utility) {

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

                // default agent state
                const INITIAL_STATE = {
                    agents: {all: []},
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

                let agents = [];
                let history = {...INITIAL_STATE.history};


                /**
                 * onStateReceived
                 * Action to perform when an Agent's state (a log) is receicved
                 *
                 * @param state: Log received 
                 */
                function onStateReceived (state) {
                    if (utility.isAValidLog(state)) {
                        // create a somewhat unique ID for agent....
                        const agent =  state.source.agent + " [" +  state.source.mas + "]";
                        // ensure agent is known and has a history cache...
                        if (history[agent] === undefined) {
                            agents.push(agent);
                            $rootScope.$broadcast('AGENT-DISCOVERED', agent);
                            history[agent] = _.cloneDeep(INITIAL_STATE.agentHistory);
                            history[agent].activities["IDENTIFIER"] = agent;
                            history[agent].current = history[agent].activities;
                        }

                        switch (state.payload.category) {
                            case DEFAULTS.states.action:
                                logAction(agent, state);
                                break;
                            case DEFAULTS.states.sense:
                                logSense(agent, state);
                                break;
                            case DEFAULTS.states.planSelection:
                                logPlanSelection(agent, state);
                                break;
                            case DEFAULTS.states.planTrace:
                                logPlanTrace(agent, state);
                                break;
                            case DEFAULTS.states.planNotFound:
                                logPlanNotFound(agent, state);
                                break;
                            default:    // there is nothing to do...
                                return;
                        }

                        // update listeners....
                        $rootScope.$broadcast('AGENT-STATE-CHANGED', agent);
                    }
                }


                function logAction (agent, action) {
                    history[agent].branch = null;
                    history[agent].current['children'] = [action];
                    history[agent].last = history[agent].current;
                    history[agent].current = action;
                }

                function logPlanNotFound (agent, stateLog) {
                    /*const state = stateLog.TYPE_INFO;
                    const agent = stateLog.AGENT;

                    if (vm.history[agent].current === null) { return; }

                    if (vm.history[agent].current.IDENTIFIER.trim() === state.IDENTIFIER.trim()) {
                        vm.history[agent].current['FAILURE_REASON'] = state["REASON"];
                    }*/

                }

                function logPlanSelection (agent, stateLog) {
                    const state = stateLog.TYPE_INFO;

                    if (vm.history[agent].branch !== null) {
                        let targetIndex = 0;
                        vm.history[agent].branch.forEach(function(item, index) {
                            if (
                                (item.IDENTIFIER === state.IDENTIFIER)
                                &&
                                (item["CODE_LINE"] === state["CODE_LINE"])
                                &&
                                (item["CODE_FILE"] === state["CODE_FILE"])
                                &&
                                //(item["CONTEXT_PASSED"] === true)
                                (item["CONTEXT"] === state["CONTEXT"])

                            ){
                                targetIndex =  index;
                            }
                        });
                        // CASES WHERE WE HAVE A FLAWED context HIGHLIGHT
                        vm.history[agent].branch[targetIndex]['CONTEXT_PASSED'] = true;
                        console.log("swapping....");
                        swapBranchNodes(
                            agent,
                            vm.history[agent].branch,
                            Math.floor(vm.history[agent].branch.length / 2),
                            targetIndex
                        )
                    }
                }

                function logPlanTrace (agent, planTrace) {

                    const availableOptions = planTrace.payload.contents.length;
                    const traceClone = _.cloneDeep(planTrace);
                    let visibleIndex = 0;

                    /*
                        If there are an even number of available paths,
                        insert an invisible node so we can gracefully
                        ensure the agent's activities can be maintained on
                        a straight line.
                     */
                    if ((availableOptions % 2) === 0) {
                        planTrace.payload.contents.unshift({
                            ...DEFAULTS.invisibleNode
                        });
                        visibleIndex =  1;
                    }

                    const expandedOptions = planTrace.payload.contents.map((option) => {
                                                let optionEntry = {...traceClone};
                                                optionEntry.payload.contents = option;
                                                return optionEntry
                                            });


                    history[agent].branch = expandedOptions;
                    if ((history[agent].current !== undefined) &&
                        (history[agent].current !== null)){
                        history[agent].current["children"] = expandedOptions;
                        history[agent].last = vm.history[agent].current;
                    }

                    history[agent].current = expandedOptions[visibleIndex];

                    //todo: context verification handling
                    /*history[agent].branch.forEach(function (trace) {
                        const val = verifyContext(agent, state.SEQUENCE_NUMBER, trace.CONTEXT);
                        trace.CONTEXT_PASSED = val.CONTEXT_PASSED;
                        trace.CONTEXT_META = val.CONTEXT_META;
                    });*/
                }

                function logSense (stateLog) {
                    const state = stateLog.TYPE_INFO;
                    const agent = stateLog.AGENT;
                    const sequence =  state.SEQUENCE_NUMBER;


                    let currentState = [];
                    if (state.ACTION === "DUMP") {
                        const valueStr = state.VALUES || "";
                        const values = valueStr.split(";");
                        values.forEach(function (value) {
                            const valueParts =  (value + "|").split("|");
                            if (valueParts[0].trim().length > 0){
                                currentState.push({
                                    value: fixEntry(valueParts[0].trim()),
                                    source: fixEntry(valueParts[1].trim()),
                                    type: fixEntry(valueParts[2].trim())
                                });
                            }
                        })
                    }


                    vm.history[agent].beliefs[( sequence + "").trim()] = _.uniqWith(currentState, _.isEqual);
                    vm.history[agent].removedBeliefs[(sequence + "").trim()] = [];


                    const previousSequence =  sequence - 1;
                    if (
                        vm.history[agent].beliefs[previousSequence + ""] !== undefined
                    )
                    {
                        vm.history[agent].removedBeliefs[sequence + ""] =
                            _.uniqWith(
                                _.cloneDeep(
                                    _.differenceBy(
                                        vm.history[agent].beliefs[previousSequence + ""],
                                        currentState,
                                        "value"
                                    )
                                ),
                                _.isEqual
                            );


                        vm.history[agent].removedBeliefs[sequence + ""].forEach(function  (val) {
                            val.isDeleted = true;
                        });
                    }
                    else {
                        vm.history[agent].removedBeliefs[sequence + ""] = [];
                    }

                    if (agent === vm.agents.selected) {
                        updateBeliefBrowser(agent, sequence);
                        $scope.$apply();
                    }
                }






                // service API
                return {
                    getAgentsList: function () { return agents; },
                    onLogReceived: onStateReceived,



                };

        }]);