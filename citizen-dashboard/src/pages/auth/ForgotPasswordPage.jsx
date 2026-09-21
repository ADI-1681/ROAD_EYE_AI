import { Link } from 'react-router-dom';
import RoadEyeLogo from '../../components/RoadEyeLogo';

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/50">
        <div className="mb-6 text-center">
          <RoadEyeLogo compact className="mx-auto" />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Recovery flow is mocked for this demo. Use the prefilled account on the login screen to continue.
        </div>

        <div className="mt-6">
          <Link
            to="/login"
            className="inline-flex w-full items-center justify-center rounded-xl bg-cyan-700 px-4 py-3 text-base font-semibold text-white transition hover:bg-cyan-800"
          >
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
