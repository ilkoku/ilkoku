export type ProfileActionState = {
  message: string;
  status: "idle" | "error" | "success";
};

export const initialProfileState: ProfileActionState = {
  message: "",
  status: "idle",
};
