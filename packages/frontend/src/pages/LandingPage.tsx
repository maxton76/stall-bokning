import Header from '@/components/shadcn-studio/blocks/hero-section-01/header'
import HeroSection from '@/components/shadcn-studio/blocks/hero-section-01/hero-section-01'
import FooterSection from '@/components/shadcn-studio/blocks/footer-component-01/footer-component-01'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Check, Star } from 'lucide-react'

const navigationData = [
  { title: 'Features', href: '#features' },
  { title: 'Testimonials', href: '#testimonials' },
  { title: 'Pricing', href: '#pricing' },
  { title: 'Contact', href: '#contact' }
]

const LandingPage = () => {
  return (
    <>
      <Header navigationData={navigationData} />
      <main>
        <HeroSection />
        
        {/* Features Section */}
        <section id="features" className="py-24 bg-muted/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Premium Stable Facilities</h2>
              <p className="text-muted-foreground">Everything your horse needs for comfort and care</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle>Modern Stables</CardTitle>
                  <CardDescription>Spacious, climate-controlled stalls with premium bedding</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>12x12 ft individual stalls</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Automatic watering systems</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Daily turnout access</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Professional Care</CardTitle>
                  <CardDescription>Expert staff available 24/7 for your peace of mind</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Certified equine specialists</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Daily health monitoring</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>On-site veterinary care</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Training Facilities</CardTitle>
                  <CardDescription>State-of-the-art arenas and training equipment</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Indoor & outdoor arenas</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Professional trainers</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Trail riding access</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">What Our Clients Say</h2>
              <p className="text-muted-foreground">Trusted by horse owners across the region</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card>
                <CardHeader>
                  <div className="flex gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <CardTitle>Excellent Care</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    "The staff here treats my horse like family. The facilities are top-notch and I have complete peace of mind."
                  </p>
                  <p className="font-semibold">- Sarah Johnson</p>
                  <p className="text-sm text-muted-foreground">Horse Owner, 2 years</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <CardTitle>Best Decision</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    "Moving my horses here was the best decision. The booking system is so easy to use and the care is exceptional."
                  </p>
                  <p className="font-semibold">- Michael Chen</p>
                  <p className="text-sm text-muted-foreground">Professional Trainer</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <CardTitle>Highly Recommended</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    "Professional service, beautiful facilities, and fair pricing. I recommend StableBook to all my friends."
                  </p>
                  <p className="font-semibold">- Emma Williams</p>
                  <p className="text-sm text-muted-foreground">Competitive Rider</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-24 bg-muted/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Flexible Pricing Plans</h2>
              <p className="text-muted-foreground">Choose the perfect plan for your horse's needs</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Care</CardTitle>
                  <CardDescription>Essential boarding for your horse</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">$450</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Standard stall</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Daily feeding & water</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Pasture turnout</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Stall cleaning</span>
                    </li>
                  </ul>
                  <Button className="w-full" variant="outline" asChild>
                    <a href="/register">Get Started</a>
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-primary">
                <CardHeader>
                  <Badge className="w-fit mb-2">Most Popular</Badge>
                  <CardTitle>Premium Care</CardTitle>
                  <CardDescription>Enhanced services for your champion</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">$750</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Premium stall (12x12)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Premium feed & supplements</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Daily grooming</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Arena access included</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Weekly health reports</span>
                    </li>
                  </ul>
                  <Button className="w-full" asChild>
                    <a href="/register">Get Started</a>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Elite Care</CardTitle>
                  <CardDescription>VIP treatment for elite horses</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">$1,200</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Deluxe stall (14x14)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Custom feed program</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Daily grooming & exercise</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Private training sessions</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>24/7 camera monitoring</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Priority vet care</span>
                    </li>
                  </ul>
                  <Button className="w-full" variant="outline" asChild>
                    <a href="/register">Get Started</a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
      
      <div id="contact">
        <FooterSection />
      </div>
    </>
  )
}

export default LandingPage
