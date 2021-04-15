vm.mimicAction =  function () {

    onStateReceived({
        "AGENT": "Alice",
        "TYPE": "ACTION",
        "TYPE_INFO": {
            "IDENTIFIER": "move(1,0)",
            VALUES: "",
            ACTION: undefined
        },
        "TIME_IN_MS": 1610281344629,
        "SECONDARY_TIMER": 5,
        "SEQUENCE_NUMBER": 5

    });
    onStateReceived({
            "MAS": "demo_mas",
            "TYPE": "SENSE",
            "AGENT": "Alice",
            "TYPE_INFO": {
                "ACTION": "DUMP",
                "VALUES": "action_completed(move)|percept;has_cattle|belief"
            },
            "TIME_IN_MS": 1610281344629,
            "SECONDARY_TIMER": 5,
            "SEQUENCE_NUMBER": 5
        }




    );
}
vm.mimicPlanTrace =  function () {
    onStateReceived(
        {
            "MAS": "demo_mas",
            "TYPE": "SENSE",
            "AGENT": "Alice",
            "TYPE_INFO": {
                "ACTION": "DUMP",
                "VALUES": "action_completed(move)|percept;"
            },
            "TIME_IN_MS": 1610281344629,
            "SECONDARY_TIMER": 5,
            "SEQUENCE_NUMBER": 6
        });
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
        ],
        "TIME_IN_MS": 1610281344629,
        "SECONDARY_TIMER": 5,
        "SEQUENCE_NUMBER": 6
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

function verifyContextOld (agent, sequence, context) {
    if (context === undefined || context === "null") { return {
        CONTEXT_PASSED: true,
        CONTEXT_META: [ ["None", true]]
    } }
    const agentBeliefsAtSequence =  vm.history[agent].beliefs[sequence];
    let double_context = {};
    let double_context_counter = 0;
    // remove external wrapping
    context = context.replace(" ", "");
    if (context.startsWith("(") && context.endsWith(")")){
        context = context.substr(1, context.length - 2);
    }
    while (getFirstDoubleWrappedExpression(context) !== undefined) {
        //create other dump
        let expression =  getFirstDoubleWrappedExpression(context);
        double_context["p" + double_context_counter] = expression["expression"]
        context = context.replace(
            expression["enclosed_expression"], " p" + double_context_counter
        );
        double_context_counter ++;
    }

    let evaluationSummary = [];
    let evalPass = true;

    // split all
    let contextParts =  context.split("&");
    contextParts.forEach((contextPart) => {
        contextPart = contextPart.trim();
        contextPart = removeBrackets(fixEntry(contextPart));
        const presentableContextPart = (contextPart + "");
        //alert(presentableContextPart);

        let evaluatesIfTrue = true;

        if (contextPart.startsWith("not")){
            evaluatesIfTrue = false;
            contextPart =  contextPart.replace("not", "").trim();
            contextPart = removeBrackets(fixEntry(contextPart));
        }
        // check if it exists in our chunk.....
        if (double_context[contextPart] !== undefined) {
            const dcParts =  double_context[contextPart].split("&");
            dcParts.forEach((dcPart) => {
                dcPart = removeBrackets(fixEntry(dcPart));
                const partPass = evaluatesIfTrue === hasBelief(
                    agentBeliefsAtSequence,
                    dcPart,
                    contextPart.indexOf("_") > -1)
                evalPass = evalPass & partPass;

                evaluationSummary.push([
                    evaluatesIfTrue ? dcPart : "not " +  dcPart,
                    partPass
                ])
            })



        }
        else {
            contextPart = removeBrackets(contextPart);
            const partPass = evaluatesIfTrue === hasBelief(
                agentBeliefsAtSequence,
                contextPart,
                contextPart.indexOf("_") > -1)
            evalPass = evalPass && partPass;

            evaluationSummary.push([
                evaluatesIfTrue ? contextPart : "not " +  contextPart,
                partPass
            ])
        }
    })
    return {
        CONTEXT_PASSED: evalPass,
        CONTEXT_META: evaluationSummary
    };

}
function removeBrackets (contextPart) {
    if (contextPart.startsWith("(")  && ! contextPart.endsWith(")")) {
        contextPart =  contextPart.substr(1).trim();
    } else if (! contextPart.startsWith("(") && contextPart.endsWith(")")) {
        contextPart = contextPart.substr(0, contextPart.length -1).trim();
    } else if (contextPart.startsWith("(") && contextPart.endsWith(")")) {
        contextPart = contextPart.substr(1, contextPart.length - 2).trim();
    }
    return contextPart;
}
function removeSquareBrackets (contextPart) {
    if (contextPart.startsWith("[")  && ! contextPart.endsWith("]")) {
        contextPart =  contextPart.substr(1).trim();
    } else if (! contextPart.startsWith("[") && contextPart.endsWith("]")) {
        contextPart = contextPart.substr(0, contextPart.length -1).trim();
    } else if (contextPart.startsWith("[") && contextPart.endsWith("]")) {
        contextPart = contextPart.substr(1, contextPart.length - 2).trim();
    }
    return contextPart;
}

function placeMissingBracket (contextPart) {
    if (contextPart.includes("(")  && ! contextPart.includes(")")) {
        return contextPart + ")";
    }else  if (contextPart.includes(")")  && ! contextPart.includes("(")) {
        return  "(" + contextPart ;
    }
    return contextPart;
}

function fixEntry (entry) {
    entry = removeBrackets(entry);
    entry = removeSquareBrackets(entry);
    entry =  placeMissingBracket(entry);
    return entry;
}


function getFirstDoubleWrappedExpression (phrase) {
    let startPoint = -1;
    let endPoint = -1;

    for (let i = 1; i <phrase.length; i++) {
        if ((phrase[i-1] === "(")  && (phrase[i] === "(")) {
            startPoint = i + 1;
        } else if ((phrase[i+1] === ")" ) && ( phrase[i] === ")")) {
            endPoint = i-1;
            break;
        }
    }

    if (startPoint === -1 || endPoint === -1) {
        return undefined;
    } else {
        return  {
            "enclosed_expression": phrase.substr(startPoint-2, (endPoint-startPoint) + 5),
            "expression": phrase.substr(startPoint, (endPoint-startPoint) + 1),
        }
    }

}






