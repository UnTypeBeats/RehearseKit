import { ProcessingQueue } from "@/components/processing-queue";

export default function JobsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job History</h1>
          <p className="text-muted-foreground mt-2">
            View and manage all your audio processing jobs
          </p>
        </div>

        <ProcessingQueue />
      </div>
    </div>
  );
}

