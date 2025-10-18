import { AudioUploader } from "@/components/audio-uploader";
import { ProcessingQueue } from "@/components/processing-queue";

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Hero Section */}
        <section className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Your Complete Rehearsal Toolkit
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Transform any audio source into a ready-to-use rehearsal project in minutes.
            Upload FLAC files or paste YouTube URLs to get started.
          </p>
        </section>

        {/* Upload Section */}
        <section className="bg-card rounded-lg border shadow-sm p-8">
          <AudioUploader />
        </section>

        {/* Processing Queue */}
        <section>
          <ProcessingQueue />
        </section>

        {/* Features Grid */}
        <section className="grid md:grid-cols-3 gap-6 pt-8">
          <div className="space-y-2 p-6 bg-card rounded-lg border">
            <div className="w-12 h-12 rounded-lg bg-kit-blue/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-kit-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <h3 className="font-semibold text-lg">Stem Separation</h3>
            <p className="text-sm text-muted-foreground">
              AI-powered isolation of vocals, drums, bass, guitars, keys, and more using state-of-the-art models.
            </p>
          </div>

          <div className="space-y-2 p-6 bg-card rounded-lg border">
            <div className="w-12 h-12 rounded-lg bg-kit-purple/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-kit-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-lg">Tempo Detection</h3>
            <p className="text-sm text-muted-foreground">
              Automatic BPM analysis with confidence scoring and manual override for perfect synchronization.
            </p>
          </div>

          <div className="space-y-2 p-6 bg-card rounded-lg border">
            <div className="w-12 h-12 rounded-lg bg-kit-success/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-kit-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </div>
            <h3 className="font-semibold text-lg">DAW Integration</h3>
            <p className="text-sm text-muted-foreground">
              Auto-generated Cubase project files with stems pre-loaded, tempo configured, and mixer ready.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

