"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Sidebar } from "@/components/sidebar"
import { WalletConnect } from "@/components/wallet-connect"
import { ThemeToggle } from "@/components/theme-toggle"
import { useWeb3 } from "@/components/web3-provider"
import { useFirebase } from "@/components/firebase-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Upload, User } from "lucide-react"
import type { UserProfile } from "@/lib/types"
import { WalletConnectionCard } from "@/components/wallet-connection-card"
// Import the IpfsInfo component
import { IpfsInfo } from "@/components/ipfs-info"

export default function ProfilePage() {
  const { account, isConnected } = useWeb3()
  const { getUserProfile, updateUserProfile, uploadProfilePicture } = useFirebase()
  const { toast } = useToast()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [username, setUsername] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [errors, setErrors] = useState<{ username?: string }>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isClient, setIsClient] = useState(false)

  // This effect ensures we only check wallet connection status on the client side
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (account) {
      fetchUserProfile()
    }
  }, [account])

  const fetchUserProfile = async () => {
    if (!account) return

    setIsLoading(true)
    try {
      const profile = await getUserProfile(account)
      if (profile) {
        setUserProfile(profile)
        setUsername(profile.username)
      }
    } catch (error) {
      console.error("Error fetching user profile:", error)
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !account) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please upload an image file",
        variant: "destructive",
      })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image must be less than 5MB",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    // Show preview immediately for better UX
    setPreviewUrl(URL.createObjectURL(file))

    try {
      toast({
        title: "Processing",
        description: "Processing your profile picture...",
      })

      toast({
        title: "Uploading",
        description: "Uploading your profile picture to IPFS...",
      })

      const ipfsUrl = await uploadProfilePicture(file, account)

      if (!ipfsUrl) {
        throw new Error("Failed to get IPFS URL for uploaded image")
      }

      if (userProfile?.id) {
        await updateUserProfile(userProfile.id, {
          profilePicture: ipfsUrl,
        })

        setUserProfile({
          ...userProfile,
          profilePicture: ipfsUrl,
        })

        toast({
          title: "Success",
          description: "Profile picture uploaded to IPFS and updated successfully",
        })
      }
    } catch (error) {
      console.error("Error processing/uploading profile picture to IPFS:", error)

      // Extract and display a more user-friendly error message
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"

      toast({
        title: "Upload Failed",
        description: `Failed to upload profile picture: ${errorMessage}`,
        variant: "destructive",
      })

      // Revert preview if upload fails
      setPreviewUrl(userProfile?.profilePicture || null)
    } finally {
      setIsUploading(false)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const validateForm = (): boolean => {
    const newErrors: { username?: string } = {}

    if (!username.trim()) {
      newErrors.username = "Username is required"
    } else if (username.length < 3) {
      newErrors.username = "Username must be at least 3 characters"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!account || !userProfile?.id) {
      toast({
        title: "Error",
        description: "Wallet not connected or profile not found",
        variant: "destructive",
      })
      return
    }

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      await updateUserProfile(userProfile.id, {
        username,
      })

      setUserProfile({
        ...userProfile,
        username,
      })

      toast({
        title: "Success",
        description: "Profile updated successfully",
      })
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // If we're on the server or haven't initialized client-side yet, return nothing to avoid hydration issues
  if (!isClient) {
    return null
  }

  // If wallet is not connected, show the wallet connection card
  if (!isConnected || !account) {
    return <WalletConnectionCard />
  }

  return (
    <div className="flex h-screen dark-container">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-gray-200 bg-white/80 backdrop-blur-sm px-6 dark-header">
          <h1 className="text-xl font-bold">Profile</h1>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <WalletConnect />
          </div>
        </header>
        <main className="container mx-auto max-w-3xl py-8 px-4">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-6">
              <Card className="overflow-hidden dark-card">
                <CardHeader className="dark:border-gray-700">
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription className="dark:text-gray-400">Update your profile information</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative">
                        <Avatar className="h-24 w-24 dark:border dark:border-gray-700">
                          {userProfile?.profilePicture ? (
                            <AvatarImage
                              src={userProfile.profilePicture || "/placeholder.svg"}
                              alt={userProfile.username}
                            />
                          ) : previewUrl ? (
                            <AvatarImage src={previewUrl || "/placeholder.svg"} alt="Profile preview" />
                          ) : (
                            <AvatarFallback className="dark:bg-gray-700">
                              <User className="h-12 w-12" />
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="absolute bottom-0 right-0 h-8 w-8 rounded-full transition-all duration-200 dark:bg-gray-700 dark:border-gray-600"
                          onClick={triggerFileInput}
                          disabled={isUploading}
                        >
                          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground dark:text-gray-400">
                        Click the button to upload a new profile picture
                      </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="wallet-address" className="dark:text-gray-300">
                          Wallet Address
                        </Label>
                        <Input
                          id="wallet-address"
                          value={account}
                          disabled
                          className="bg-muted dark-input dark:text-gray-300"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="username" className="dark:text-gray-300">
                          Username
                        </Label>
                        <Input
                          id="username"
                          value={username}
                          onChange={(e) => {
                            setUsername(e.target.value)
                            if (e.target.value.trim()) {
                              setErrors((prev) => ({ ...prev, username: undefined }))
                            }
                          }}
                          placeholder="Enter a username"
                          className={`dark-input ${errors.username ? "border-destructive" : ""}`}
                        />
                        {errors.username && <p className="text-sm text-destructive">{errors.username}</p>}
                      </div>

                      <div className="flex justify-end">
                        <Button type="submit" disabled={isLoading} className="dark:bg-primary dark:hover:bg-primary/90">
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save Changes"
                          )}
                        </Button>
                      </div>
                    </form>
                  </div>
                </CardContent>
              </Card>

              {/* Add the IPFS info card */}
              <div className="dark-card">
                <IpfsInfo />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
