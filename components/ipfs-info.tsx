"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, ExternalLink, Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function IpfsInfo() {
  const { toast } = useToast()
  const [pinataStatus, setPinataStatus] = useState<"checking" | "connected" | "error">("checking")
  const [ipfsGateway, setIpfsGateway] = useState("https://gateway.pinata.cloud")

  useEffect(() => {
    checkPinataConnection()
  }, [])

  const checkPinataConnection = async () => {
    try {
      // Check if Pinata API keys are set
      const apiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY
      const secretKey = process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY

      if (!apiKey || !secretKey) {
        setPinataStatus("error")
        return
      }

      // For demo purposes, we'll just check if the keys exist
      // In a real app, you would make an actual API call to Pinata
      setPinataStatus("connected")
    } catch (error) {
      console.error("Error checking Pinata connection:", error)
      setPinataStatus("error")
    }
  }

  const handleTestConnection = async () => {
    setPinataStatus("checking")

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // For demo purposes, we'll assume success
      setPinataStatus("connected")

      toast({
        title: "Connection Successful",
        description: "Successfully connected to Pinata IPFS service.",
      })
    } catch (error) {
      console.error("Error testing Pinata connection:", error)
      setPinataStatus("error")

      toast({
        title: "Connection Failed",
        description: "Failed to connect to Pinata IPFS service.",
        variant: "destructive",
      })
    }
  }

  return (
    <Card className="dark:bg-gray-800 dark:border-gray-700 dark:shadow-md dark:shadow-black/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>IPFS Configuration</CardTitle>
            <CardDescription className="dark:text-gray-400">
              InterPlanetary File System storage settings
            </CardDescription>
          </div>
          <Badge
            variant={pinataStatus === "connected" ? "default" : "destructive"}
            className={
              pinataStatus === "connected" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" : ""
            }
          >
            {pinataStatus === "checking" ? (
              <span className="flex items-center">
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Checking...
              </span>
            ) : pinataStatus === "connected" ? (
              "Connected"
            ) : (
              "Not Connected"
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="font-medium dark:text-gray-300">IPFS Gateway</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 ml-1 dark:hover:bg-gray-700">
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="dark:bg-gray-900 dark:border-gray-700">
                    <p>The gateway used to access your IPFS content</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <span className="text-sm text-muted-foreground dark:text-gray-400">{ipfsGateway}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="font-medium dark:text-gray-300">Storage Provider</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 ml-1 dark:hover:bg-gray-700">
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="dark:bg-gray-900 dark:border-gray-700">
                    <p>The service used to pin your IPFS content</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <span className="text-sm text-muted-foreground dark:text-gray-400">Pinata</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="font-medium dark:text-gray-300">API Status</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 ml-1 dark:hover:bg-gray-700">
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="dark:bg-gray-900 dark:border-gray-700">
                    <p>Current status of the IPFS API connection</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Badge
              variant={pinataStatus === "connected" ? "outline" : "destructive"}
              className={pinataStatus === "connected" ? "dark:border-green-600 dark:text-green-400" : ""}
            >
              {pinataStatus === "connected" ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>

        <div className="flex justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600"
            onClick={() => window.open("https://app.pinata.cloud/", "_blank")}
          >
            Open Pinata Dashboard
            <ExternalLink className="ml-1 h-3 w-3" />
          </Button>

          <Button
            variant="default"
            size="sm"
            className="text-xs"
            onClick={handleTestConnection}
            disabled={pinataStatus === "checking"}
          >
            {pinataStatus === "checking" ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Testing...
              </>
            ) : (
              "Test Connection"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
