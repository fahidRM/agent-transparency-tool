/**
 * @author: Fahid RM
 * @name: Transparency Dashboard
 * @desc: Controller for the transparency dashboard
 *
 *
 */

angular.module('app.transparency_dashboard', [])
    .controller(
        'DashboardController',
        [
            '$rootScope', '$scope', 'Server','TraceService',
            function ($rootScope, $scope, server, trace) {

                // default options
                const DEFAULTS = {
                    colours: {
                        agent: "#000000",
                        failureNode: "#f8c291",
                        traversedNode: "#16a085",
                        traversableNode: "#1abc9c",
                        unTraversableNode: "#e74c3c"
                    },
                    maxTries:  1,
                    recognisedTypes: ["belief", "message", "norm", "percept", "sensor", "value"],
                    rootNode: {payload: { contents: { IDENTIFIER: "[My Agent]"} }},
                }

                // initial states
                const INITIAL_STATE = {
                    agents: {all: [], selected: undefined}
                }


                let vm = this;                           // view model
                vm.agents = { ...INITIAL_STATE.agents};  // known agents
                vm.autoscroll = true;                    // autoscroll status
                vm.filteredKnowledgeBase = [];
                vm.freeze = false;                       // freeze knowledge base update
                vm.isShowingSettingsPane = false;
                vm.knowledgeBase = [];
                vm.selectedViewPreference = {};          // view preference being viewed
                vm.serverIsRunning = false;              // debugger status
                vm.searchString = "";                    // kb-search string
                vm.viewPreference = []                   //  view preferences

                /** D3 variables **/
                let diagonal,
                    div,            // container div of the SVG chart
                    duration = 0,   // transition period
                    margin = {top: 20, right: 10, bottom: 20, left: 10}, // display margin
                    i = 0,
                    root,
                    svg,
                    tree,
                    width =  10000000;


                /**
                 * AGENT-DISCOVERED event listener
                 * listens to the event that an agent has been discovered...
                 *
                 * @param event: {Object} angular-js broadcast event object
                 * @param agent: {String} Name of Discovered agent
                 */
                $rootScope.$on('AGENT-DISCOVERED', function(event, agent) {
                    if (agent === undefined || agent === null) { return; }
                    vm.agents.all.push(agent);
                    if (vm.agents.selected === undefined) {
                        vm.selectAgent(agent);
                    }
                    $scope.$apply();
                });


                /**
                 * AGENT-KB-CHANGED event listener
                 * listens to the event that an agent's knowledge-base has been updated...
                 *
                 * @param event:     {Object} angular-ja broadcast event object
                 * @param changeInfo: {Object} Information about the change {agent: String, sequence: Integer}
                 */
                $rootScope.$on('AGENT-KB-CHANGED', function(event, changeInfo) {
                    if ((changeInfo.agent === vm.agents.selected) && ! vm.freeze)
                    {

                        const kbUpdate = trace.getAgentKBAt(changeInfo.agent, changeInfo.sequence);
                        vm.knowledgeBase = [...kbUpdate.beliefs, ...kbUpdate.removedBeliefs];
                        vm.searchKnowledgeBase();
                        $scope.$apply();
                    }
                });


                /**
                 * AGENT-STATE-CHANGED event listener
                 * listens to the event that an agent's state has changed
                 *
                 * @param event: {Object} angular-js broadcast event object.
                 * @param agent: {String} Name of Agent whose state changed.
                 */
                $rootScope.$on('AGENT-STATE-CHANGED', function(event, agent) {
                   // if the state of the agent we have selected changes, we need to visualise it
                   if (vm.agents.selected === agent) {
                       root =  trace.getAgentTrace(agent);
                       updateVisualisation(root);
                   }
                });


                /**
                 * getIcon
                 * Returns associated icon for the knowledge base entry based on its type
                 *
                 * @param kbEntry   Knowledge Base Entry
                 * @returns {*|string|string} icon name as string
                 */
                vm.getIcon = function(kbEntry) {
                    const iconName = DEFAULTS.recognisedTypes.includes(kbEntry.type) ? kbEntry.type : "unknown";
                    return kbEntry.isDeleted === undefined ?
                        iconName : iconName + "_deleted";
                }

                /**
                 * vm.initialise
                 * Initialises the tool
                 * ... configures the server and ensures it updates the visualiser
                 * with the logs received.
                 * ... sets up the visualisation board so agent state may be displayed
                 *
                 * @agent {String | optional} Name of agent to set up the visualisation board for (optional parameter)
                 */
                vm.initialise = function (agent) {
                    server.setup(trace.onLogReceived);
                    setupVisualisationBoard(agent);
                }

                /**
                 * vm.reset
                 * Resets the tool
                 */
                vm.reset = function () {
                    while(vm.agents.all.length){ vm.agents.all.pop(); }
                    vm.agents.selected = undefined;
                    vm.autoscroll = true;
                    vm.filteredKnowledgeBase = [];
                    vm.freeze = false;
                    vm.knowledgeBase = [];
                    vm.searchString = "";
                    trace.reset();
                    const vBoard = angular.element(document.querySelector("#visualisation_board"));
                    vBoard.empty();
                    vm.initialise();

                }

                /**
                 * searchKnowledgeBase
                 * Searches the knowledge-base using data contained in
                 * the search-string entered to present a filtered
                 * knowledge base that is presented to the user.
                 *
                 * Note: View-Model method triggered by UI-button click
                 */
                vm.searchKnowledgeBase = function () {
                    if (vm.searchString.length === 0) {
                        vm.filteredKnowledgeBase =  vm.knowledgeBase;
                    } else {
                        vm.filteredKnowledgeBase = _.filter(
                            vm.knowledgeBase,
                            function (kbEntry) {
                                return kbEntry.value.startsWith(vm.searchString);
                            }
                        );
                    }
                }

                /**
                 * vm.selectAgent
                 * Selects an agent to visualise
                 *
                 * @param agent {String} Name of agent to be visualised
                 */
                vm.selectAgent = function (agent) {
                    vm.agents.selected = agent;
                    // clear what is currently visualised....
                    const vBoard = angular.element(document.querySelector("#visualisation_board"));
                    vBoard.empty();
                    // initialise the visualisation board with the selected agent's data
                    root =  trace.getAgentTrace(agent);
                    // select bb for last trace....
                    vm.initialise(agent);
                }

                /**
                 * vm.toggleAutoscroll
                 * Toggles the visualisation's autoscroll feature
                 */
                vm.toggleAutoscroll = function () {
                    vm.autoscroll =  ! vm.autoscroll;
                    if (vm.autoscroll) { vm.freeze = false; }
                }

                /**
                 * vm.toggleServer
                 * Toggles the server on/off
                 */
                vm.toggleServer = function() {
                    if (vm.serverIsRunning) {
                        server.stop();
                    } else {
                        vm.initialise();
                        server.start();
                    }
                    vm.serverIsRunning = !vm.serverIsRunning;
                }

                /**
                 * vm.toggleSettingsPane
                 * Toggles (shows/hides) the settings pane
                 */
                vm.toggleSettingsPane =  function () {
                    // clear selected view preference
                    vm.selectedViewPreference = undefined;
                    vm.isShowingSettingsPane =  ! vm.isShowingSettingsPane;
                    // update the view preference
                    vm.viewPreference = _.cloneDeep(trace.getViewPreference());
                    // select the first view preference to ensure the UI is not blank
                    vm.selectedViewPreference = vm.viewPreference[0];
                }

                /**
                 * vm.toggleViewPreference
                 * Toggles the view preference of the selected log class
                 *
                 * @param index Index of the property who's view preference is being toggled
                 */
                vm.toggleViewPreference = function (index) {
                    vm.selectedViewPreference.options[index].visible = !vm.selectedViewPreference.options[index].visible;
                    vm.viewPreference[vm.selectedViewPreference.index] = vm.selectedViewPreference;
                }

                /**
                 * vm.updateViewPreference
                 * Update the view preference and apply changes to the user interface
                 */
                vm.updateViewPreference = function () {
                    trace.setViewPreference(vm.viewPreference);
                    vm.toggleSettingsPane();
                }

                /**
                 * getNodeColour
                 * Inspect a node and decide what colour it should be
                 *
                 * @param node          Visualisation (Graph) node
                 * @returns {string}    Colour as text or hex
                 */
                function getNodeColour (node) {
                    let nodeColour;
                    if (node["FAILURE_REASON"] !== undefined) {
                        nodeColour = DEFAULTS.colours.failureNode;
                    }
                    else if (node.payload === undefined) { nodeColour = DEFAULTS.colours.agent; }
                    else if (node.payload.contents.IS_PADDING_NODE !== undefined) { nodeColour = "white"}
                    else if ((node.context_summary === undefined) || (node.context_summary.context_passed)) {
                        nodeColour = DEFAULTS.colours.traversableNode
                    }
                    else {
                        nodeColour =  DEFAULTS.colours.unTraversableNode
                    }
                    return nodeColour;
                }

                /**
                 * mouseover
                 * mouseover event handler for nodes
                 */
                function mouseover() {
                    div.transition()
                        .duration(100)
                        .style("opacity", 1);
                }

                /**
                 * mouseout
                 * mouseout event handler for nodes
                 */
                function mouseout() {
                    div.transition()
                        .duration(100)
                        .style("opacity", 1e-6);
                }

                /**
                 * mousemove
                 * Event handler for nodes...
                 * Responsible for displaying popups with node summary.
                 *
                 * @param d node hovered over.
                 */
                function mousemove(d) {
                    //todo: regenerate if view preference changes at runtime

                    if (    // the view preference is currently being updated or a pop-up summary
                            // has not already been generated already
                            trace.isApplyingViewPreference()
                            ||
                            d.mousemove_html === undefined
                        ) {

                        // node positioning
                        div.text("")
                            .style("left", (d3.event.pageX ) + "px")
                            .style("top", (d3.event.pageY) + "px");

                        // place default information....
                        div.append("b").text(d.payload.contents.IDENTIFIER);
                        if (d.context_summary !== undefined) {
                            div.append("br")
                            div.append("br")
                            div.append("b").text("context:");
                            d.context_summary.context_info.forEach(function (context) {
                                div.append("br")
                                div.append("span")
                                    .text(context[0])
                                    .style("color",
                                        context[1] ? DEFAULTS.colours.traversableNode
                                            : DEFAULTS.colours.unTraversableNode
                                    );
                            });
                        }
                        // request view options information
                        trace.applyViewPreference(d);
                        // add additional selected information here....
                        if (d.viewOptions !== undefined) {
                            d.viewOptions.forEach(function (viewOption) {
                               if (viewOption.visible && viewOption.canHide) { // filter out the defaults
                                   div.append("br");
                                   div.append("b").text(viewOption.name + ":");
                                   div.append("br");
                                   div.append("span").text(d.payload.contents[viewOption.name] || "");
                                   div.append("br");
                               }
                            });
                        }
                        // store the generated summary to avoid reprocessing
                        d["mousemove_html"] = div.html();

                    } else {
                        div.html(d.mousemove_html);
                        // reposition the tooltip
                        // without this, the tooltip will appear in the wrong location
                        div.style("left", (d3.event.pageX ) + "px")
                            .style("top", (d3.event.pageY) + "px");
                    }

                }

                /**
                 * selectState
                 * Select Agent State to display
                 *
                 * @note: Triggered by clicking on a visualisation node.
                 *
                 * @param state State selected
                 */
                function selectState (state) {
                    // ensure the dashboard doesnt scroll beyond what's being looked at
                    vm.autoscroll = false;
                    // ensure the knowledge-base browser is not over-written by new logs received
                    vm.freeze = true;
                    const kbUpdate = trace.getAgentKBAt(state.source.agent_uid, state.time["sequence_number"]);
                    vm.knowledgeBase = [...kbUpdate.beliefs, ...kbUpdate.removedBeliefs];
                    // preserve search filter
                    vm.searchKnowledgeBase();
                    $scope.$apply();
                }

                /**
                 * setupVisualisationBoard
                 * Sets up the visualisation board (d3 diagram)
                 * @param agent {String | optional} Name of Agent to visualise (optional param)
                 */
                function setupVisualisationBoard(agent) {
                    const height = document.getElementById('view_region').offsetHeight - document.getElementById('view_header').offsetHeight - margin.top - margin.bottom;
                    tree = d3.layout.tree().size([height, width]);
                    diagonal = d3.svg.diagonal().projection(function(d) { return [d.y, d.x]; });
                    svg = d3.select("#visualisation_board").append("svg")
                            .attr("width", width + margin.right + margin.left + 400)
                            .attr("height", height + margin.top + margin.bottom)
                            .append("g")
                            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                    if (agent === undefined) { root = {...DEFAULTS.rootNode}; }
                    root.x0 = height / 2;
                    root.y0 = 0;
                    updateVisualisation(root);
                }

                /**
                 * update Visualisation
                 * Updates the visualisation being shown on the dashboard
                 *
                 * @param source    {object}   Visualisation source object. i.e. Agent's trace
                 */
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
                        return (link.target.payload.contents.IS_PADDING_NODE === undefined);
                    });



                    // Normalize for fixed-depth.
                    nodes.forEach(function(d) {
                        d.y = d.depth * 180;
                    });

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
                                return "translate(" + (source.y0 || 0) + "," + (source.x0 || 0) + ")";
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
                                if (d.node_colour === undefined) {
                                    d["node_colour"] =getNodeColour
                                    //return (d);
                                }
                                return d.node_colour;
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
                        .text(function(d) {
                            return "\n" + (d.payload ? d.payload.contents.IDENTIFIER.substring(0, 10) : ""); })
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
                            if (d.target.payload.contents.IS_PADDING_NODE !== undefined) {
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

            }
        ]
    )