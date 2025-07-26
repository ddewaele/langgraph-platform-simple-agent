import {AIMessage, HumanMessage} from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
// import { TavilySearch } from "@langchain/tavily";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";

const tools = [new TavilySearchResults({ maxResults: 3 })];
// const tools = [new TavilySearch({ maxResults: 3 })];

// Define the function that calls the model
async function callModel(state: typeof MessagesAnnotation.State) {

    const model = new ChatOpenAI({
        model: "gpt-4o",
    }).bindTools(tools);

    const response = await model.invoke([
        {
            role: "system",
            content: `You are a helpful assistant. The current date is ${new Date().getTime()}.`,
        },
        ...state.messages,
    ]);

    return { messages: response };
}

function routeModelOutput(state: typeof MessagesAnnotation.State) {
    const messages = state.messages;
    const lastMessage: AIMessage = messages[messages.length - 1];
    if ((lastMessage?.tool_calls?.length ?? 0) > 0) {
        return "tools";
    }
    return "__end__";
}

const workflow = new StateGraph(MessagesAnnotation)
    .addNode("callModel", callModel)
    .addNode("tools", new ToolNode(tools))
    .addEdge("__start__", "callModel")
    .addConditionalEdges(
        "callModel",
        routeModelOutput,
        ["tools", "__end__"]
    )
    .addEdge("tools", "callModel");

export const graph = workflow.compile();
