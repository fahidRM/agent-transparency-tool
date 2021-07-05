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
                    agentHistory: {
                        activities: DEFAULTS.rootNode,
                        beliefs: {},
                        branch: null,
                        currentNode: null,
                        lastNode: null,
                        removedBeliefs: {},
                        selectedNode: null
                    },
                    viewOptions: {
                        ACTION: {index: 0, val: ['IDENTIFIER']},
                        PLAN_NOT_FOUND: {index: 1, val: ['IDENTIFIER']},
                        PLAN_TRACE: {index: 2, val: ['IDENTIFIER', 'CONTEXT']}
                    },
                    viewPreferences: [
                        {index: 0, name: "ACTION", options: [{name: "IDENTIFIER", visible: true, canHide: false}]},
                        {index: 1, name: "PLAN_NOT_FOUND", options: [{name: "IDENTIFIER", visible: true, canHide: false}]},
                        {index: 2, name: "PLAN_TRACE", options: [{name: "IDENTIFIER", visible: true, canHide: false}, {name: "CONTEXT", visible: true, canHide: false}]}
                    ]
                }

                let agents = [];
                let applyingViewPreference = false;
                let history = {};
                let viewOptions = {...INITIAL_STATE.viewOptions};
                let viewPreferences = INITIAL_STATE.viewPreferences;

                /**
                 * onStateReceived
                 * Action to perform when an Agent's state (a log) is received
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


                        if (viewOptions[state.payload.category] !== undefined){
                            updateViewOptions(state);
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


                function updateViewOptions (state) {
                    const payloadCategory =  state.payload.category;
                    const identifiedOptions =  payloadCategory === DEFAULTS.states.planTrace
                                                ? Object.keys(state.payload.contents[0]) || []
                                                : Object.keys(state.payload.contents);
                    let newOptions = _.difference(identifiedOptions, viewOptions[payloadCategory].val);
                    if (newOptions.length > 0) {
                        newOptions.forEach(function (newOption){
                           viewPreferences[viewOptions[payloadCategory].index].options.push(
                               { name: newOption, visible: false, canHide: true }
                           );
                        });
                        viewOptions[payloadCategory].val = newOptions.concat(viewOptions[payloadCategory].val);
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
                        console.log(history[agent].branch);
                        history[agent].branch.forEach(function(item, index) {

                            console.log("checking...." + item.payload.contents.IDENTIFIER);

                            if (
                                (item.payload.contents.IDENTIFIER === planSelection.payload.contents.IDENTIFIER)
                                &&
                                (item.payload.contents['CODE_LINE'] === planSelection.payload.contents['CODE_LINE'])
                                &&
                                (item.payload.contents['CODE_FILE'] === planSelection.payload.contents['CODE_FILE'])
                                &&
                                (JSON.stringify(item.payload.contents['CONTEXT']) === JSON.stringify(planSelection.payload.contents['CONTEXT']))
                                &&
                                (item['IS_PADDING_NODE'] === undefined)

                            ){
                                console.log("PASSED....");
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
                    history[agent].branch = null;
                    history[agent].branch = expandedOptions;
                    if ((history[agent].current !== undefined) &&
                        (history[agent].current !== null)){
                        history[agent].current["children"] = expandedOptions;
                        history[agent].last = history[agent].current;
                    }

                    history[agent].current = expandedOptions[visibleIndex];
                    history[agent].branch.forEach((branchEntry) => {
                       branchEntry["context_summary"] = utility.verifyContext(
                            branchEntry.payload.contents['CONTEXT'],
                            history[agent].beliefs[branchEntry.time['sequence_number']]
                       );
                    });
                }

                function logSense (agent, sense) {
                    const sequence = sense.time['sequence_number'];
                    let currentState = [];
                    if (sense.payload.contents.ACTION === "DUMP") {
                        currentState = sense.payload.contents['VALUES'];
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

                /*function getAgentCurrentKB(agent) {
                    let sequence = "";
                    return getAgentKB(agent, sequence);
                }*/

                function getAgentTrace (agent) {
                    if (history[agent] !== undefined) {
                        return history[agent].activities;
                    }
                    return {};
                }




                function reset(){
                    agents = [];
                    history = {};
                    viewOptions = {...INITIAL_STATE.viewOptions};
                    viewPreferences = INITIAL_STATE.viewPreferences;
                }

                function setViewPreference (preference) {
                    viewPreferences = _.cloneDeep(preference);
                    applyingViewPreference = true;
                    agents.forEach(function (agent) {
                        traverseHistory(history[agent].activities, function (state){
                            state.mousemove_html = undefined;
                        });
                    });
                    applyingViewPreference = false;
                }

                /**
                 * traverseHistory
                 * Traverses the history of an agent and applies the callback on each node
                 *
                 * @param rootNode  Root Node of agent history
                 * @param callback  Callback to execute on each node...
                 */
                function traverseHistory (rootNode, callback) {
                    callback(rootNode);
                    if (rootNode.children !== undefined) {
                        rootNode.children.forEach(function (child) {
                           traverseHistory(child, callback);
                        });
                    }
                }

                function applyViewPreference (state) {
                    // obtain the view preference for the state provided
                    if (viewOptions[state.payload.category] !== undefined) {
                        state.viewOptions = viewPreferences[
                            viewOptions[state.payload.category].index
                            ].options || [];
                    }
                }





                // service API
                return {
                    applyViewPreference: applyViewPreference,
                    //getAgentsList: function () { return agents; },
                    getAgentTrace: getAgentTrace,
                    getAgentKBAt: getAgentKB,
                    //getAgentCurrentKB: getAgentCurrentKB,
                    //getViewOptions: function () { return viewOptions; },
                    getViewPreference: function () { return viewPreferences; },
                    isApplyingViewPreference: function () { return applyingViewPreference; },
                    onLogReceived: onStateReceived,
                    reset: reset,
                    setViewPreference: setViewPreference
                };

        }]);