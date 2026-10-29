import { DropdownMenuItem } from "./dropdown-menu";
import Link from "next/link";

export default function ProfileButton() {
    return (
        <DropdownMenuItem render={<Link href="/profile" />}>
            Profile
        </DropdownMenuItem>
    );
}