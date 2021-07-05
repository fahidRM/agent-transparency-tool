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


        /**
         * Checks to see if a specific piece of information is in the
         * Knowledge base snapshot
         *
         * @param knowledgeBase   snapshot of the knowledgeBase
         * @param context         information to search for
         * @param ignoreBrackets  flag to ignore brackets (see parsing JASON context)
         * @returns {boolean}     existence of information piece
         */
        function hasKnowledge (knowledgeBase, context, ignoreBrackets) {
            if (
                (knowledgeBase === undefined) ||
                (knowledgeBase === null) ||
                (context === undefined) ||
                (context === null)

            ){
                return false;
            }
            context = context.trim()
            for (let knowledge of knowledgeBase) {
                if (ignoreBrackets) {
                    if (knowledge.value.startsWith(context)) {
                        return true;
                    }
                }else {
                    if (knowledge.value === context) {
                        return true;
                    }
                }
            }
            return false;
        }

        /**
         * Verify that a context has passed or failed
         *
         * @param context                       Agent plan execution context
         * @param agentKnowledgeBaseSnapshot    Snapshot of the agent's knowledge base at the point of planning
         * @returns {{context_info: (string|boolean)[][], context_passed: boolean}|{context_info: *[], context_passed: boolean}}
         */
        function verifyContext ( context, agentKnowledgeBaseSnapshot) {
            if (context === undefined || context === "null" || context.length === 0) { return {
                context_passed: true,
                context_info: [ ["None", true]]
            } }

            let evaluationPassed = true;
            let evaluationSummary = [];


            context.forEach((contextElement) => {
                contextElement = contextElement.trim();

                if (contextElement === "null") {
                    evaluationSummary.push([
                        "No context",
                        true
                    ])
                } else {
                    let evaluatesIfTrue = ! contextElement.startsWith("not");
                    if (! evaluatesIfTrue) { contextElement = contextElement.replace("not", "").trim(); }

                    const partPass = evaluatesIfTrue === hasKnowledge(
                        agentKnowledgeBaseSnapshot,
                        contextElement,
                        contextElement.indexOf("_") > -1)

                    evaluationPassed = evaluationPassed && partPass;
                    evaluationSummary.push([
                        evaluatesIfTrue ? contextElement : "not " +  contextElement,
                        partPass
                    ])
                }




            })

            return {
                context_passed: evaluationPassed,
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