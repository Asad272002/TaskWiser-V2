import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Quote } from "lucide-react"

export function LandingTestimonials() {
  return (
    <section id="testimonials" className="py-20 md:py-32">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary">Testimonials</div>
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Trusted by Web3 Teams Worldwide</h2>
            <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              See what our users are saying about how Task Wiser has transformed their workflow and productivity.
            </p>
          </div>
        </div>

        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 py-12 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <Quote className="h-8 w-8 text-primary/40" />
              <p className="mt-4 text-muted-foreground">
                "Task Wiser has completely transformed how our DAO manages bounties. The AI recommendations have helped
                us find the perfect contributors for our projects."
              </p>
              <div className="mt-6 flex items-center gap-3">
                <Avatar>
                  <AvatarImage src="/images/testimonial-1.png" alt="Alex Thompson" />
                  <AvatarFallback>AT</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">Alex Thompson</p>
                  <p className="text-xs text-muted-foreground">Core Contributor, peaq network</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <Quote className="h-8 w-8 text-primary/40" />
              <p className="mt-4 text-muted-foreground">
                "The Kanban board with Web3 integration is a game-changer. We can now track progress and automate
                payments all in one place. Highly recommended!"
              </p>
              <div className="mt-6 flex items-center gap-3">
                <Avatar>
                  <AvatarImage src="/images/testimonial-2.png" alt="Sarah Chen" />
                  <AvatarFallback>SC</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">Sarah Chen</p>
                  <p className="text-xs text-muted-foreground">Project Manager, ZetaChain</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <Quote className="h-8 w-8 text-primary/40" />
              <p className="mt-4 text-muted-foreground">
                "As a freelancer in the Web3 space, Task Wiser has helped me find relevant bounties and build my
                on-chain reputation. The AI assistant is like having a personal career coach."
              </p>
              <div className="mt-6 flex items-center gap-3">
                <Avatar>
                  <AvatarImage src="/images/testimonial-3.png" alt="Miguel Rodriguez" />
                  <AvatarFallback>MR</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">Miguel Rodriguez</p>
                  <p className="text-xs text-muted-foreground">Smart Contract Developer</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
