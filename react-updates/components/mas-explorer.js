/**
 * @author: Fahid Mohammed (fahidrm)
 *
 * mas-explorer
 * The MAS explorer component allows a user to
 * view all agents that are currently logging to
 * the tool and their respective mas.
 *
 * Using the mas explorer, a user may choose what
 * agent(s) to view....
 *
 * As the tool is designed to visualise multiple
 * agents across multiple windows, one requirement
 * was to ensure this component's data is same
 * across pages but the selection is different
 * across these pages
 *
 */
import React, {useState} from 'react';
import {arrayOf, shape, func} from 'prop-types';


const MasExplorer = ({
    currentSelection,   // current selection of agents
    knownAgents,        // a list of agents known
    onAgentSelected,    // action to perform on agent selection
    onAgentUnselected   // action to perform on agent un-selection
}) => {





    return (
        ""
    )
}


MasExplorer.propTypes = {
    currentSelection: arrayOf(shape()).isRequired,
    knownAgents: arrayOf(String).isRequired,
    onAgentSelected: func.isRequired,
    onAgentUnselected: func.isRequired
}

export default MasExplorer;