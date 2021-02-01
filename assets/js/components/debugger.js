
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
                    agents: {all: [], selected: null},
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


                let vm = this;          // view model
                vm.agents = {...INITIAL_STATE.agents};
                vm.autoscroll = true;
                vm.history = {...INITIAL_STATE.history};
                vm.isRunning = false;   //debugger status
                vm.selectedAgent = "";


                /** D3 lets **/
                $scope.currentSequence = 0;
                let diagonal,
                    div,            // container div of the SVG chart
                    duration = 0,   // transition period
                    margin = {top: 20, right: 10, bottom: 20, left: 10},
                    i = 0,
                    //poll,
                    root,
                    //sessionTag = "",
                    svg,
                    tree,
                    width =  10000000;



                /**
                 * vm.initialise
                 * Initialises the debugger....
                 *
                 */
                vm.initialise = function (agent) {
                    setupRestApi();
                    setupVisualisationBoard(agent);
                }

                /**
                 * Changes the Agent being visualised.
                 *
                 * @param agent Agent Name
                 */
                vm.selectAgent = function (agent) {
                    vm.agents.selected = agent;
                    const vBoard = angular.element(document.querySelector("#visualisation_board"));
                    vBoard.empty();
                    vm.initialise(agent);
                }

                vm.toggleAutoscroll = function () {
                    vm.autoscroll =  ! vm.autoscroll;
                }
                /**
                 * Toggles the server state
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
                    app.use(bodyParser.json())
                    app.post('/log', (req, res) => {
                        // inform client that request has been received
                        res.send();
                        // handle request
                        onStateReceived(req.body);
                    });
                }

                /**
                 * setupVisualisationBoard
                 *
                 * Sets up the svg container for visualisation
                 * @param agent
                 */
                function setupVisualisationBoard (agent) {
                    const height = document.getElementById('view_region').offsetHeight - document.getElementById('view_header').offsetHeight - margin.top - margin.bottom;

                    tree = d3.layout.tree().size([height, width]);
                    diagonal = d3.svg.diagonal()
                        .projection(function(d) { return [d.y, d.x]; });
                    svg = d3.select("#visualisation_board").append("svg")
                        .attr("width", width + margin.right + margin.left + 400)
                        .attr("height", height + margin.top + margin.bottom)
                        .append("g")
                        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                    root = {};
                    if (agent !== undefined) {
                        root =  _.cloneDeep(vm.history[agent].activities);
                    }
                    root.x0 = height / 2;
                    root.y0 = 0;
                    updateVisualisation(root);
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
                    if (vm.agents.selected === null) {
                        vm.selectAgent(concernedAgent);
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
                    if (vm.agents.selected === state.AGENT) {
                        updateChart(state.AGENT);
                    }

                }

                function updateChart (ag) {
                    root  = vm.history[ag].activities;
                    updateVisualisation(root);
                }

                function getNodeColour (d) {
                    let nodeColour;
                    if (d["FAILURE_REASON"] !== undefined) {
                        nodeColour = DEFAULTS.colours.failureNode;
                    }
                    else if (d.IS_PADDING_NODE !== undefined) { nodeColour = "white"}
                    else if ((d.CONTEXT_PASSED === undefined) || (d.CONTEXT_PASSED)) {
                        nodeColour = DEFAULTS.colours.traversableNode
                    }
                    else {
                        nodeColour =  DEFAULTS.colours.unTraversableNode
                    }
                    return nodeColour;
                }

                function updateVisualisation (source) {
                    // Compute the new tree layout.
                    if (div === undefined) {
                        div = d3.select("body").append("div")
                            .attr("class", "tooltip")
                            .style("opacity", 1e-6);
                    }

                    let nodes = tree.nodes(root).reverse();
                    let links = tree.links(nodes);

                    links = _.remove(links, function (link) {
                        return (link.target.IS_PADDING_NODE === undefined);
                    });



                    // Normalize for fixed-depth.
                    nodes.forEach(function(d) { d.y = d.depth * 180; });

                    // Update the nodes…
                    let node = svg.selectAll("g.node").data(
                        nodes, function(d) {
                            return d.id || (d.id = ++i);
                        });

                    // Enter any new nodes at the parent's previous position.
                    let nodeEnter = node.enter()
                        .append("g")
                        .attr("class", "node")
                        .attr(
                            "transform",
                            function() {
                                return "translate(" + source.y0 + "," + source.x0 + ")";
                            })
                        .on("click", selectState);

                    nodeEnter.append("svg:circle")
                        .on("mouseover", mouseover)
                        .on("mousemove", function(d){mousemove(d);})
                        .on("mouseout", mouseout)
                        .attr("r", 1e-6)
                        .style(
                            "fill",
                            function(d) {
                                return getNodeColour(d);
                            });

                    nodeEnter.append("svg:text")
                        .attr(
                            "x",
                            function(d) {
                                return d.children || d["_children"] ? -13 : 13;
                            })
                        .attr("dy", ".35em")
                        .attr(
                            "text-anchor",
                            function(d) {
                                return d.children || d["_children"] ? "end" : "start";
                            })
                        .text(function(d) { return "\n" + d.IDENTIFIER; })
                        .style("fill-opacity", 1e-6);

                    // Transition nodes to their new position.
                    let nodeUpdate = node.transition()
                        .duration(duration)
                        .attr("transform", function(d) {
                            return "translate(" + d.y + "," + d.x + ")";
                        });

                    nodeUpdate.select("circle")
                        .attr("r", 10)
                        .style("fill", function(d) {
                            return getNodeColour(d);
                        });

                    nodeUpdate.select("text")
                        .style("fill-opacity", 1);

                    // Transition exiting nodes to the parent's new position.
                    let nodeExit = node.exit().transition()
                        .duration(duration)
                        .attr("transform", function() {
                            return "translate(" + source.y + "," + source.x + ")";
                        })
                        .remove();

                    nodeExit.select("circle")
                        .attr("r", 1e-6);

                    nodeExit.select("text")
                        .style("fill-opacity", 1e-6);


                    // Update the links…
                    let link = svg.selectAll("path.link")
                        .data(links, function(d) {
                            if (d.IS_PADDING_NODE !== undefined) {
                                return null;
                            } else {
                                return d.target.id;
                            }
                        });



                    // Enter any new links at the parent's previous position.
                    link.enter().insert("path", "g")
                        .attr("class", "link")
                        .attr("d", function() {
                            let o = {x: source.x0, y: source.y0};
                            return diagonal({source: o, target: o});
                        });

                    // Transition links to their new position.
                    link.transition()
                        .duration(duration)
                        .attr("d", diagonal);

                    // Transition exiting nodes to the parent's new position.
                    link.exit().transition()
                        .duration(duration)
                        .attr("d", function() {
                            let o = {x: source.x, y: source.y};
                            return diagonal({source: o, target: o});
                        })
                        .remove();

                    // Stash the old positions for transition.


                    let visualisationBoardContainer = document.getElementById("view_region");
                    let visualisationBoard = document.getElementById("visualisation_board");
                    const visualisationBoardVisibleWidth = visualisationBoardContainer.offsetWidth;
                    let lastNodePosition = 0;

                    nodes.forEach(function(d) {

                        lastNodePosition = lastNodePosition < d.y ? d.y : lastNodePosition;
                        d.x0 = d.x;
                        d.y0 = d.y;
                    });

                    if (vm.autoscroll) {
                        if (lastNodePosition > (0.8 * visualisationBoardVisibleWidth)) {
                            visualisationBoard.scrollLeft = lastNodePosition - (0.8 * visualisationBoardVisibleWidth);
                        }
                    }
                }



                function logAction (stateLog) {
                    const state = stateLog.TYPE_INFO;
                    const agent = stateLog.AGENT;
                    vm.history[agent].branch = null;
                    vm.history[agent].current["children"] = [state];
                    vm.history[agent].last = vm.history[agent].current;
                    vm.history[agent].current = state;
                }




                function logPlanTrace (stateLog) {
                    const state = stateLog.TYPE_INFO;
                    const agent = stateLog.AGENT;
                    let visibleIndex = 0;
                    if ((state.length % 2) === 0) {
                        state.unshift(DEFAULTS.invisibleNode);
                        visibleIndex = 1;
                    }
                    state.forEach(function (entry) {
                        entry.SEQUENCE_NUMBER = stateLog.SEQUENCE_NUMBER;
                    });

                    vm.history[agent].branch = state;
                    vm.history[agent].current["children"] = state;
                    vm.history[agent].last = vm.history[agent].current;
                    vm.history[agent].current = state[visibleIndex];
                }



                function verifyContext (agent, sequence, contextString) {
                    if (contextString === undefined || contextString === null) { contextString = "-"; }
                    contextString = contextString.trim();
                    if (contextString === "-") { return {
                        CONTEXT_PASSED: true,
                        CONTEXT_META: [ ["None", true]]
                    } }
                    else {

                        const trimmedContext =  contextString.trim().replace(" ", "");
                        if (trimmedContext.indexOf("&") > -1) {
                            const trimmedContextParts = trimmedContext.split("&");
                            let extract = [];

                            trimmedContextParts.forEach(function (trimmedContextPart) {
                                if (trimmedContextPart.startsWith("(")) { trimmedContextPart = trimmedContextPart.substring(1); }
                                if (
                                    (trimmedContextPart.endsWith(")") &&  (trimmedContextPart.indexOf("(") === -1) ) ||
                                    (trimmedContextPart.endsWith(")") && (trimmedContextPart.indexOf("(") !== trimmedContextPart.lastIndexOf("("))) ||
                                    (trimmedContextPart.endsWith(")") && (trimmedContextPart.indexOf(")") !== trimmedContextPart.lastIndexOf(")")) && (trimmedContextPart.indexOf("(") === trimmedContextPart.lastIndexOf("(")))
                                ){
                                    trimmedContextPart = trimmedContextPart.substr(0, trimmedContextPart.length - 1);
                                }

                                const finalCotext = trimmedContextPart.trim();
                                extract.push(finalCotext);
                            });
                            return getContextSummary(agent, sequence, extract);

                            /* return {
                                 CONTEXT_PASSED: allPassed,
                                 CONTEXT_META: extract
                             };*/
                        } else {
                            return getContextSummary(agent, sequence, [trimmedContext]);
                        }
                    }
                }



                function getContextSummary (agent, sequence, contextList) {
                    const agentBeliefsAtSequence =  vm.history[agent].beliefs[sequence];

                    let allPassed = true;
                    let contextSummary = [];

                    contextList.forEach(function (context) {
                        const rawContext = context;
                        context = context.trim();
                        let passOnExist =  true;
                        let ignoreBracketContents = false;
                        if (context.indexOf("not(") > -1) {
                            context = context.replace("not(", "");
                            context =  context.substr(0, context.length - 1).trim();
                            passOnExist = false;
                        }

                        if (
                            (context.indexOf("(") > -1) &&
                            (context.indexOf("_") > context.indexOf("(") )
                        ) {
                            ignoreBracketContents = true;
                            context = context.split("(")[0];
                        }

                        if (ignoreBracketContents) {
                            let fx = hasBelief(agentBeliefsAtSequence, context, true);
                            contextSummary.push([
                                rawContext,
                                fx
                            ]);
                            allPassed = allPassed && fx;

                        }
                        else {
                            let found =  hasBelief(agentBeliefsAtSequence, context, false);
                            contextSummary.push([
                                rawContext,
                                found === passOnExist
                            ])
                            allPassed = allPassed && (found === passOnExist);
                        }

                    });
                    return {
                        CONTEXT_PASSED: allPassed,
                        CONTEXT_META: contextSummary
                    };
                }


                function hasBelief (beliefBase, context, ignoreBrackets) {
                    if (
                        (beliefBase === undefined) ||
                        (beliefBase === null) ||
                        (context === undefined) ||
                        (context === null)

                    ){
                        return false;
                    }
                    for (let belief of beliefBase) {
                        if (ignoreBrackets) {
                            if (belief.value.trim().startsWith(context.trim())) {
                                return true;
                            }
                        }else {
                            if (belief.value.trim() === context.trim()) {
                                return true;
                            }
                        }
                    }
                    return false;
                }


                function logPlanSelection (stateLog) {
                    const state = stateLog.TYPE_INFO;
                    const agent = stateLog.AGENT;

                    if (vm.history[agent].branch !== null) {
                        let targetIndex = 0;
                        vm.history[agent].branch.forEach(function(item, index) {
                            if (
                                (item.IDENTIFIER === state.IDENTIFIER)
                                &&
                                (item["CODE_LINE"] === state["CODE_LINE"])
                                &&
                                (item["CODE_FILE"] === state["CODE_FILE"])
                            ){
                                targetIndex =  index;
                            }
                        });
                        swapBranchNodes(
                            agent,
                            vm.history[agent].branch,
                            Math.floor(vm.history[agent].branch.length / 2),
                            targetIndex
                        )

                        vm.history[agent].branch.forEach(function (trace) {
                            const val = verifyContext(agent, state.SEQUENCE_NUMBER, trace.CONTEXT);
                            trace.CONTEXT_PASSED = val.CONTEXT_PASSED;
                            trace.CONTEXT_META = val.CONTEXT_META;
                        });

                    }
                }

                function logPlanNotFound (stateLog) {
                    const state = stateLog.TYPE_INFO;
                    const agent = stateLog.AGENT;

                    if (vm.history[agent].current === null) { return; }

                    if (vm.history[agent].current.IDENTIFIER.trim() === state.IDENTIFIER.trim()) {
                        vm.history[agent].current['FAILURE_REASON'] = state["REASON"];
                    }

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
                                    value: valueParts[0].trim(),
                                    source: valueParts[1].trim()
                                });
                            }
                        })
                    }


                    vm.history[agent].beliefs[( sequence + "").trim()] = currentState;
                    vm.history[agent].removedBeliefs[(sequence + "").trim()] = [];


                    const previousSequence =  sequence - 1;
                    if (
                        vm.history[agent].beliefs[previousSequence + ""] !== undefined
                    ) {
                        vm.history[agent].removedBeliefs[sequence + ""] = _.differenceBy(
                            vm.history[agent].beliefs[previousSequence + ""],
                            currentState,
                            "value"
                        );
                    } else {
                        vm.history[agent].removedBeliefs[sequence + ""] = [];
                    }

                }

                vm.getCurrentBB = function() {
                    if (vm.agents.selected === null) { return []; }
                    let rt = []
                    if (vm.history[vm.agents.selected].beliefs !== undefined) {
                        rt = vm.history[vm.agents.selected].beliefs[("S_" + $scope.currentSequence + "").trim()];
                    }
                    return rt;
                }

                function swapBranchNodes (agent, branch, indexA, indexB) {
                    let temp = branch[indexA];
                    branch[indexA] = branch[indexB];
                    branch[indexB] = temp;
                    vm.history[agent].last["children"] = branch;
                    vm.history[agent].current = branch[indexA];
                    vm.history[agent].branch = branch;
                }




                function selectState (state) {
                    vm.autoscroll = false;
                    vm.freeze = true;
                    console.log(state);
                    //showStateBB(state.SEQUENCE_NUMBER + 1);
                }

                function mouseover() {
                    div.transition()
                        .duration(300)
                        .style("opacity", 1);
                }

                function mousemove(d) {
                    div.text("")
                        .style("left", (d3.event.pageX ) + "px")
                        .style("top", (d3.event.pageY) + "px");
                    div.append("b").text(d.IDENTIFIER);

                    if (d["CODE_FILE"] !== undefined) {
                        div.append("br");
                        div.append("br");
                        div.append("b").text("Code file: " + d["CODE_FILE"]);
                        div.append("br");
                        div.append("b").text("Code line: " + d["CODE_LINE"]);
                    }


                    if (d.CONTEXT_META !== undefined) {
                        div.append("br")
                        div.append("br")
                        div.append("b").text("context:");
                        d.CONTEXT_META.forEach(function (metaEntry) {
                            div.append("br")
                            div.append("span")
                                .text(metaEntry[0])
                                .style("color",
                                    metaEntry[1] ? DEFAULTS.colours.traversableNode
                                        : DEFAULTS.colours.unTraversableNode
                                );
                        });
                    }

                    if (d["FAILURE_REASON"] !== undefined) {
                        div.append("br");
                        div.append("br");
                        div.append("b").text("Failure: ");
                        div.append("br");
                        div.append("span")
                            .text( d["FAILURE_REASON"])
                            .style("color", DEFAULTS.colours.unTraversableNode);
                    }

                }

                function mouseout() {
                    div.transition()
                        .duration(300)
                        .style("opacity", 1e-6);
                }


                vm.mimicAction =  function () {

                    onStateReceived({
                        "AGENT": "Alice",
                        "SEQUENCE_NUMBER": 11,
                        "TYPE": "ACTION",
                        "TYPE_INFO": {
                            "IDENTIFIER": "move(1,0)",
                            VALUES: "",
                            ACTION: undefined
                        }

                    });
                }

                vm.mimicPlanTrace =  function () {
                    onStateReceived({
                        "TYPE": "PLAN_TRACE",
                        "AGENT": "Alice",
                        "TYPE_INFO": [
                            {
                                "IDENTIFIER": "opt_a",
                                "CONTEXT": "has_cat & has_bicycle",
                                "CONTEXT_PASSED": false,
                                "CONTEXT_META": [
                                    ["has_cattle", false],
                                    ["has_beans", true]
                                ]
                            },
                            {
                                "IDENTIFIER": "opt_c",
                                "CONTEXT": "has_cat & not has_bicycle",
                                "CONTEXT_PASSED": true,
                                "CONTEXT_META": [
                                    ["is_plant_farm", true],
                                    ["has_beans", true]
                                ]
                            }
                        ]
                    });
                }
                vm.mimicPlanSelection =  function () {
                    onStateReceived({
                        "TYPE": "PLAN_SELECTION",
                        "AGENT": "Alice",
                        "TYPE_INFO": {
                            "IDENTIFIER": "opt_c",
                            "CONTEXT": "has_cat & not has_bicycle"
                        }
                    });
                }
            }
        ]
    )