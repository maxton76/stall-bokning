import { FacebookIcon, InstagramIcon, TwitterIcon, YoutubeIcon } from 'lucide-react'

import { Separator } from '@/components/ui/separator'

import Logo from '@/components/shadcn-studio/logo'

const Footer = () => {
  return (
    <footer>
      <div className='mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 max-md:flex-col sm:px-6 sm:py-6 md:gap-6 md:py-8'>
        <a href='#'>
          <div className='flex items-center gap-3'>
            <Logo className='gap-3' />
          </div>
        </a>

        <div className='flex items-center gap-5 whitespace-nowrap'>
          <a href='#features'>Facilities</a>
          <a href='#testimonials'>Reviews</a>
          <a href='#pricing'>Pricing</a>
          <a href='#contact'>Contact</a>
        </div>

        <div className='flex items-center gap-4'>
          <a href='#'>
            <FacebookIcon className='size-5' />
          </a>
          <a href='#'>
            <InstagramIcon className='size-5' />
          </a>
          <a href='#'>
            <TwitterIcon className='size-5' />
          </a>
          <a href='#'>
            <YoutubeIcon className='size-5' />
          </a>
        </div>
      </div>

      <Separator />

      <div className='mx-auto flex max-w-7xl justify-center px-4 py-8 sm:px-6'>
        <p className='text-center font-medium text-balance'>
          {`©${new Date().getFullYear()}`} <a href='/'>Stable Booking System</a>. Professional horse boarding and care.
        </p>
      </div>
    </footer>
  )
}

export default Footer
