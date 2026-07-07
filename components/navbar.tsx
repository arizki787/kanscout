'use client';

import { Briefcase } from "lucide-react"
import Link from "next/link"
import { Button } from "./ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Avatar, AvatarFallback } from "./ui/avatar";
import SignOutButton from "./ui/sign-out-btn";
import { useSession } from "@/lib/auth/auth-client";

export default function Navbar() {
    const {data: session} = useSession();
    return (
        <nav className="flex border-b border-gray-200 bg-white">
            <div className="container mx-auto flex h-16 items-center px-4 justify-between">
                <Link href='/' className="flex items-center gap-2 text-primary text-xl font-semibold">
                    <Briefcase />
                    KANSCOUT
                </Link>
                <div className="flex items-center gap-4">
                    {session?.user ? (
                        <>
                            <Link href='/dashboard'>
                                <Button
                                    variant='ghost'
                                    className='text-gray-700 hover:text-black'
                                >
                                    Dashboard
                                </Button>
                            </Link>
                            <DropdownMenu>
                                <DropdownMenuTrigger render={
                                    <Button
                                        variant="ghost"
                                        className="relative h-8 w-8 rounded-full"
                                    />
                                }>
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback className="bg-primary text-white">
                                            {session.user.name[0].toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>
                                            <div>
                                                <p>{session.user.name}</p>
                                                <p>{session.user.email}</p>
                                            </div>
                                        </DropdownMenuLabel>
                                        <SignOutButton/>
                                    </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </>
                    ) : (
                        <>
                            <Link href='/sign-in'>
                                <Button variant='ghost' className='text-gray-700 hover:text-black'>Login</Button>
                            </Link>
                            <Link href='/sign-up'>
                                <Button className='bg-primary hover:bg-primary/90'>Start for free</Button>
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    )
}