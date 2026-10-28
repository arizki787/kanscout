'use client';

import { Briefcase } from "lucide-react"
import Link from "next/link"
import { Button } from "./ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Avatar, AvatarFallback } from "./ui/avatar";
import SignOutButton from "./ui/sign-out-btn";
import { useSession } from "@/lib/auth/auth-client";
import ProfileButton from "./ui/profile-btn";

export default function Navbar() {
    const {data: session} = useSession();
    return (
        <nav className="flex border-b border-gray-200 bg-white">
            <div className="container mx-auto flex h-16 items-center px-4 justify-between">

                <Link href='/' className="flex items-center gap-2">
                    <Briefcase className="text-primary text-xl font-semibold"/>
                    <p className="hidden lg:block text-primary text-xl font-semibold">KANSCOUT</p>
                </Link>
                <div className="flex flex-wrap items-center gap-4 md:flex-nowrap">
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
                            <Link href='/analytics'>
                                <Button
                                    variant='ghost'
                                    className='text-gray-700 hover:text-black'
                                >
                                    Analytics
                                </Button>
                            </Link>
                            <Link href='/agent'>
                                <Button
                                    variant='ghost'
                                    className='text-gray-700 hover:text-black'
                                >
                                    Agent
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

                                <DropdownMenuContent className='w-56' align="end">
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel className='font-normal'>
                                            <div className="flex flex-col space-y-1">
                                                <p className="text-sm font-medium leading-none">{session.user.name}</p>
                                                <p className='text-xs leading-none text-muted-foreground'>{session.user.email}</p>
                                            </div>
                                        </DropdownMenuLabel>
                                        <ProfileButton/>
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
