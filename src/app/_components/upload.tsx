
"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { api } from "~/trpc/react";
import toast from "react-hot-toast";

/**
 * A client-side component for uploading videos.
 * It includes a form for title and description, a drag-and-drop zone for the video file,
 * and displays upload progress.
 */
interface UploadSuccessResponse {
  success: true;
  filePath: string;
  fileSize: number;
}

interface UploadErrorResponse {
  success: false;
  error: string;
}



// Type guard to check the response shape
function isSuccessResponse(response: unknown): response is UploadSuccessResponse {
  return (response as UploadSuccessResponse).success === true;
}

/**
 * A client-side component for uploading videos.
 * It includes a form for title and description, a drag-and-drop zone for the video file,
 * and displays upload progress.
 */
export default function Upload() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  const createVideoMutation = api.video.create.useMutation({
    onSuccess: () => {
      toast.success("Video uploaded successfully!");
      setTitle("");
      setDescription("");
      setUploadProgress(0);
    },
    onError: (err) => {
      toast.error(`Error creating video record: ${err.message}`);
    },
  });

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (!title) {
      toast.error("Title is required before uploading.");
      return;
    }

    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload", true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = (event.loaded / event.total) * 100;
        setUploadProgress(percentComplete);
      }
    };

    xhr.onload = () => {
      const response: unknown = JSON.parse(xhr.responseText);

      if (xhr.status === 200 && isSuccessResponse(response)) {
        createVideoMutation.mutate({
          title,
          description,
          filePath: response.filePath,
          fileSize: response.fileSize,
        });
      } else {
        const errorMessage = (response as UploadErrorResponse).error ?? "Unknown upload error";
        toast.error(`Upload failed: ${errorMessage}`);
        setUploadProgress(0);
      }
    };

    xhr.onerror = () => {
      toast.error("An error occurred during the upload. Please try again.");
      setUploadProgress(0);
    };

    xhr.send(formData);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => void onDrop(acceptedFiles),
    multiple: false,
    accept: {
      "video/mp4": [".mp4"],
      "video/quicktime": [".mov"],
      "video/x-msvideo": [".avi"],
      "video/webm": [".webm"],
    },
    maxSize: 50 * 1024 * 1024, // 50 MB
  });

  return (
    <div className="mt-8 max-w-2xl mx-auto">
      <form
        onSubmit={(e) => e.preventDefault()}
        className="space-y-6 bg-white p-8 rounded-lg shadow-md"
      >
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="My awesome video"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description (optional)
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="A short description of your video"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Video File</label>
          <div
            {...getRootProps()}
            className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md cursor-pointer ${isDragActive ? "border-indigo-600 bg-indigo-50" : ""}`}>
            <div className="space-y-1 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="flex text-sm text-gray-600">
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">MP4, MOV, AVI up to 50MB</p>
            </div>
             <input {...getInputProps()} />
          </div>
        </div>

        {uploadProgress > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Upload Progress</label>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
              <div
                className="bg-indigo-600 h-2.5 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        <div className="text-right">
          <button
            type="submit"
            disabled={!title || createVideoMutation.isPending || (uploadProgress > 0 && uploadProgress < 100)}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            Upload Video
          </button>
        </div>
      </form>
    </div>
  );
}
