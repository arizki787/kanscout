'use client';

import { DropdownMenuItem } from "./dropdown-menu";
import { useRouter } from "next/navigation";

export default function ProfileButton() {
    const router = useRouter();

    return (

        <DropdownMenuItem onClick={() => router.push("/profile")}>
            Profile
        </DropdownMenuItem>
    );
}