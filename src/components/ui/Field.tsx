import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

type FieldStatus = "default" | "error" | "success";
type CommonFieldProps = { label: string; message?: string; status?: FieldStatus; className?: string };

type InputFieldProps = CommonFieldProps & InputHTMLAttributes<HTMLInputElement> & {
  control?: "text" | "email" | "search" | "password";
};

type TextareaFieldProps = CommonFieldProps & TextareaHTMLAttributes<HTMLTextAreaElement> & {
  control: "textarea";
};

type SelectFieldProps = CommonFieldProps & SelectHTMLAttributes<HTMLSelectElement> & {
  control: "select";
  children: ReactNode;
};

export type FieldProps = InputFieldProps | TextareaFieldProps | SelectFieldProps;

export function Field(props: FieldProps) {
  const generatedId = useId();
  const { className = "", control = "text", id, label, message, status = "default" } = props;
  const fieldId = id ?? `field-${generatedId.replaceAll(":", "")}`;
  const messageId = message ? `${fieldId}-message` : undefined;
  const wrapperClass = ["field", `field--${status}`, className].filter(Boolean).join(" ");
  const accessibility = { "aria-describedby": messageId, "aria-invalid": status === "error" || undefined };

  let controlElement: ReactNode;
  if (control === "textarea") {
    const { className: _className, control: _control, label: _label, message: _message, status: _status, ...textareaProps } = props as TextareaFieldProps;
    void _className; void _control; void _label; void _message; void _status;
    controlElement = <textarea {...textareaProps} {...accessibility} className="field__control field__textarea" id={fieldId} />;
  } else if (control === "select") {
    const { children, className: _className, control: _control, label: _label, message: _message, status: _status, ...selectProps } = props as SelectFieldProps;
    void _className; void _control; void _label; void _message; void _status;
    controlElement = <select {...selectProps} {...accessibility} className="field__control field__select" id={fieldId}>{children}</select>;
  } else {
    const { className: _className, control: _control, label: _label, message: _message, status: _status, ...inputProps } = props as InputFieldProps;
    void _className; void _control; void _label; void _message; void _status;
    controlElement = <input {...inputProps} {...accessibility} className="field__control" id={fieldId} type={control} />;
  }

  return (
    <div className={wrapperClass}>
      <label className="field__label" htmlFor={fieldId}>{label}</label>
      <div className="field__control-wrap" data-control={control}>{controlElement}</div>
      {message && <p className="field__message" id={messageId}>{message}</p>}
    </div>
  );
}
