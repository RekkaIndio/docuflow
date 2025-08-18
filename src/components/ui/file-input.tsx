import React from "react";

interface FileInputProps {
  id: string;
  onChange: (file: File | null) => void;
  accept?: string;
  className?: string;
}

export const FileInput: React.FC<FileInputProps> = ({ id, onChange, accept, className }) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    onChange(file);
  };

  return (
    <input
      type="file"
      id={id}
      accept={accept}
      className={className}
      onChange={handleFileChange}
    />
  );
};

export default FileInput;