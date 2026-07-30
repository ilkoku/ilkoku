export type PublisherApplicationActionState = {
  message: string;
  status: "idle" | "error" | "success";
};

export const initialPublisherApplicationState: PublisherApplicationActionState = {
  message: "",
  status: "idle",
};
