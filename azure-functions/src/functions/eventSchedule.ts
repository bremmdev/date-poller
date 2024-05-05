import {
  app,
  HttpHandler,
  HttpRequest,
  HttpResponse,
  InvocationContext,
} from "@azure/functions";
import * as df from "durable-functions";
import { EntityContext, EntityHandler } from "durable-functions";

type EventSchedule = {
  dateOptions: Array<string>;
};

const entityName = "eventSchedule";

const eventSchedule: EntityHandler<EventSchedule> = (
  context: EntityContext<EventSchedule>
) => {
  const currentDates: EventSchedule = context.df.getState(() => ({
    dateOptions: [],
  }));
  switch (context.df.operationName) {
    // Add a new event with specific date options to choose from
    case "create":
      const data = context.df.getInput();
      context.df.setState({ dateOptions: data.dateOptions });
      break;
    case "get":
      context.df.return(currentDates);
      break;
  }
};
df.app.entity(entityName, eventSchedule);

const eventScheduleHttpStart: HttpHandler = async (
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponse> => {
  const id: string = req.params.id;
  const entityId = new df.EntityId(entityName, id);
  const client = df.getClient(context);

  if (req.method === "POST") {
    // add a new event
    const data = await req.json();
    await client.signalEntity(entityId, "create", data);
  } else {
    // read current state of entity
    const stateResponse = await client.readEntityState(entityId);
    return new HttpResponse({
      jsonBody: stateResponse.entityState,
    });
  }
};
app.http("eventScheduleHttpStart", {
  route: `${entityName}/{id}`,
  extraInputs: [df.input.durableClient()],
  handler: eventScheduleHttpStart,
});
