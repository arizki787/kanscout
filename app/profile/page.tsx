import { getSession } from "@/lib/auth/auth";
import { getProfile } from "@/lib/actions/profile";
import ProfileEditor from "@/components/profile/profile-editor";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";


export const metadata: Metadata = {
  title: "Profile - Kanscout",
  description: "Manage your career profile and upload your resume.",
};

async function UserProfile() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  const result = await getProfile();

  if ("error" in result) {
    redirect("/sign-in");
  }

  return <ProfileEditor initialProfile={result.data} />;
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={<p className="p-6 text-muted-foreground">Loading profile...</p>}
    >
      <UserProfile />
    </Suspense>
  );
}