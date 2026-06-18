import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{
    requestId: string;
  }>;
};

export default async function CustomerRequestMatchesRedirectPage({
  params,
}: PageProps) {
  const { requestId } = await params;

  redirect(`/customer/matches?requestId=${requestId}&refresh=${Date.now()}`);
}