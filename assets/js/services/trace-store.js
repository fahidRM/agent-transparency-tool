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


angular.module('app.trace', [])
    .factory(
        'TraceService',
        [
            '$rootScope', 'UtilityService',
            function ($rootScope, utility) {

                const DEFAULTS = {
                    invisibleNode: { payload: { contents: { IDENTIFIER: ""}} , IS_PADDING_NODE: true, IDENTIFIER: "" },
                    rootNode: {payload: { contents: { IDENTIFIER: "[My Agent]"} }},
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
                        // place a UID
                        state.source['agent_uid'] = agent;
                        // ensure agent is known and has a history cache...
                        if (history[agent] === undefined) {
                            agents.push(agent);
                            $rootScope.$broadcast('AGENT-DISCOVERED', agent);
                            history[agent] = _.cloneDeep(INITIAL_STATE.agentHistory);
                            history[agent].activities.payload.contents.IDENTIFIER = agent;
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
                                //logPlanNotFound(agent, state);
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

                function logPlanSelection (agent, planSelection) {


                    if (history[agent].branch !== null) {
                        let targetIndex = 0;
                        history[agent].branch.forEach(function(item, index) {

                            if (
                                (item.payload.contents.IDENTIFIER === planSelection.payload.contents.IDENTIFIER)
                                &&
                                (item.payload.contents.CODE_LINE === planSelection.payload.contents.CODE_LINE)
                                &&
                                (item.payload.contents.CODE_FILE === planSelection.payload.contents.CODE_FILE)
                                &&
                                // TODO: uncomment...?
                                //(item["CONTEXT_PASSED"] === true)
                                (JSON.stringify(item.payload.contents.CONTEXT) === JSON.stringify(planSelection.payload.contents.CONTEXT))

                            ){
                                targetIndex =  index;
                            }
                        });
                        // CASES WHERE WE HAVE A FLAWED context HIGHLIGHT
                        history[agent].branch[targetIndex]['CONTEXT_PASSED'] = true;
                        swapBranchNodes(
                            agent,
                            history[agent].branch,
                            Math.floor(history[agent].branch.length / 2),
                            targetIndex
                        )
                    }
                }

                function swapBranchNodes (agent, branch, indexA, indexB) {
                    let temp = branch[indexA];
                    branch[indexA] = branch[indexB];
                    branch[indexB] = temp;
                    history[agent].last["children"] = branch;
                    history[agent].current = branch[indexA];
                    history[agent].branch = branch;
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

                    let expandedOptions = [];

                    planTrace.payload.contents.forEach((option) => {
                                               expandedOptions.push({
                                                   ...traceClone,
                                                   payload: { category: 'PLAN_TRACE', contents: option }
                                               })
                                            });
                    history[agent].branch = expandedOptions;
                    if ((history[agent].current !== undefined) &&
                        (history[agent].current !== null)){
                        history[agent].current["children"] = expandedOptions;
                        history[agent].last = history[agent].current;
                    }

                    history[agent].current = expandedOptions[visibleIndex];
                    history[agent].branch.forEach((branchEntry) => {
                       let contextSummary =  utility.verifyContext(
                           agent,
                           branchEntry.time.sequence_number,
                           branchEntry.payload.contents.CONTEXT,
                           history[agent].beliefs[branchEntry.time.sequence_number]
                       )
                        branchEntry["context_summary"] = contextSummary;
                    });
                    //todo: context verification handling
                    /*history[agent].branch.forEach(function (trace) {
                        const val = verifyContext(agent, state.SEQUENCE_NUMBER, trace.CONTEXT);
                        trace.CONTEXT_PASSED = val.CONTEXT_PASSED;
                        trace.CONTEXT_META = val.CONTEXT_META;
                    });*/
                }

                function logSense (agent, sense) {
                    const sequence = sense.time.sequence_number;
                    let currentState = [];
                    if (sense.payload.contents.ACTION === "DUMP") {
                        currentState = sense.payload.contents.VALUES;
                    }

                    history[agent].beliefs[( sequence + "").trim()] = _.uniqWith(currentState, _.isEqual);
                    history[agent].removedBeliefs[(sequence + "").trim()] = [];


                    const previousSequence =  sequence - 1;
                    if (
                        history[agent].beliefs[previousSequence + ""] !== undefined
                    )
                    {
                        history[agent].removedBeliefs[sequence + ""] =
                            _.uniqWith(
                                _.cloneDeep(
                                    _.differenceBy(
                                        history[agent].beliefs[previousSequence + ""],
                                        currentState,
                                        "value"
                                    )
                                ),
                                _.isEqual
                            );


                        history[agent].removedBeliefs[sequence + ""].forEach(function  (val) {
                            val.isDeleted = true;
                        });
                    }
                    else {
                        history[agent].removedBeliefs[sequence + ""] = [];
                    }
                    $rootScope.$broadcast("AGENT-KB-CHANGED", {agent: agent, sequence: sequence})

                }


                function getAgentKB (agent, sequence) {
                    if (history[agent] !== undefined) {
                        return {
                            beliefs: history[agent].beliefs[sequence],
                            removedBeliefs: history[agent].removedBeliefs[sequence]
                        }
                    }

                    return {};
                }

                function getAgentTrace (agent) {
                    if (history[agent] !== undefined) {
                        return history[agent].activities;
                    }
                    return {};
                }


                // service API
                return {
                    getAgentsList: function () { return agents; },
                    getAgentTrace: getAgentTrace,
                    getAgentKBAt: getAgentKB,
                    onLogReceived: onStateReceived,



                };

        }]);