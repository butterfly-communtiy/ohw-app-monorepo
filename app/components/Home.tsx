import { Link } from "react-router";

export function Home() {
  return (
    <div className="space-y-20 py-10">
      {/* Hero Section */}
      <section className="container mx-auto px-4">
        <div className="text-center space-y-8">
          <h1 className="text-5xl md:text-6xl font-bold">
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Open Hardware Wallet
            </span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            A secure, open-source hardware wallet solution providing comprehensive protection for your digital assets
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              to="/test"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Get Started
            </Link>
            <a
              href="https://github.com/butterfly-communtiy/ohw-elf-firmware"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 border border-gray-300 dark:border-gray-700 rounded-lg hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
            >
              View Source
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900">
            <h3 className="text-xl font-semibold mb-4">Secure & Reliable</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Utilizing advanced encryption technology to ensure your private keys are securely stored and never connected to the internet
            </p>
          </div>
          <div className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900">
            <h3 className="text-xl font-semibold mb-4">Open Source</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Fully open-source hardware design and software implementation, maintained by the community for enhanced security and trust
            </p>
          </div>
          <div className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900">
            <h3 className="text-xl font-semibold mb-4">User Friendly</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Intuitive user interface and simple operation process making blockchain technology accessible to everyone
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}