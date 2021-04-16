angular.module('app.util', [])
    .service('UtilityService', [function () {


        /**
         * isAValidLog
         * Confirms that a log is valid (i.e: Meets the minimum requirement for the tool)
         *
         * @param log   Log to validate
         * @returns {boolean}   Validity of the log
         */
        function isAValidLog (log) {
            return log !== null && log !== undefined && log.payload !== undefined && log.source !== undefined && log.time !== undefined;
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


        function verifyContext (agent, sequence, context, agentBeliefsAtSequence) {
            if (context === undefined || context === "null" || context.length === 0) { return {
                context_passed: true,
                context_info: [ ["None", true]]
            } }

            //const agentBeliefsAtSequence =  bbSnapshop; //vm.history[agent].beliefs[sequence];
            let evaluationSummary = [];
            let evalPass = true;

            context.forEach((contextElement) => {
                contextElement = contextElement.trim();
                let evaluatesIfTrue = ! contextElement.startsWith("not");
                if (! evaluatesIfTrue) { contextElement = contextElement.replace("not", "").trim(); }

                const partPass = evaluatesIfTrue === hasBelief(
                    agentBeliefsAtSequence,
                    contextElement,
                    contextElement.indexOf("_") > -1)

                evalPass = evalPass && partPass;

                evaluationSummary.push([
                    evaluatesIfTrue ? contextElement : "not " +  contextElement,
                    partPass
                ])

            })

            return {
                context_passed: evalPass,
                context_info: evaluationSummary
            };

        }




        // service API
        return {
            isAValidLog: isAValidLog,
            verifyContext: verifyContext
        }
    }
]);