'use client';

import { signOut } from "@/lib/auth/auth-client";
import { DropdownMenuItem } from "./dropdown-menu";
import { useRouter } from "next/navigation";

export default function SignOutButton() {
    const router = useRouter();

    return (
        <DropdownMenuItem 
            onClick={async () => {
                await signOut({
                    fetchOptions: {
                        onSuccess: () => {
                            router.push('/sign-in');
                            router.refresh();
                        },
                    },
                });
            }}
        >
            Log Out
        </DropdownMenuItem>
    );
}