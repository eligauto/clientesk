interface FormFieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  optional?: boolean;
  children: React.ReactNode;
}

export function FormField({
  label,
  htmlFor,
  required,
  optional,
  children,
}: FormFieldProps) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-gray-700 mb-1.5"
      >
        {label}
        {required && (
          <span className="text-red-500 ml-0.5" aria-hidden="true">
            *
          </span>
        )}
        {optional && (
          <span className="text-gray-400 font-normal ml-1">(opcional)</span>
        )}
      </label>
      {children}
    </div>
  );
}
