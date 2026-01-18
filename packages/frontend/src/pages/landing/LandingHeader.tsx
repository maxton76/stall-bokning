import { MenuIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import Logo from "@/components/shadcn-studio/logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

type LandingHeaderProps = {
  className?: string;
};

const LandingHeader = ({ className }: LandingHeaderProps) => {
  const { t } = useTranslation("landing");

  const navigationData = [
    { title: t("navigation.features"), href: "#features" },
    { title: t("navigation.modules"), href: "#modules" },
    { title: t("navigation.pricing"), href: "#pricing" },
    { title: t("navigation.documentation"), href: "#documentation" },
  ];

  return (
    <header
      className={cn("bg-background sticky top-0 z-50 h-16 border-b", className)}
    >
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/">
          <Logo className="gap-3" />
        </Link>

        {/* Navigation */}
        <NavigationMenu className="max-md:hidden">
          <NavigationMenuList className="flex-wrap justify-start gap-0">
            {navigationData.map((navItem) => (
              <NavigationMenuItem key={navItem.title}>
                <NavigationMenuLink
                  href={navItem.href}
                  className="text-muted-foreground hover:text-primary px-3 py-1.5 text-base! font-medium hover:bg-transparent"
                >
                  {navItem.title}
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        {/* Right side: Language switcher + Auth buttons */}
        <div className="flex items-center gap-2 max-md:hidden">
          <LanguageSwitcher />
          <Button variant="ghost" asChild>
            <Link to="/login">{t("navigation.login")}</Link>
          </Button>
          <Button asChild>
            <Link to="/register">{t("navigation.register")}</Link>
          </Button>
        </div>

        {/* Navigation for small screens */}
        <div className="flex items-center gap-2 md:hidden">
          <LanguageSwitcher />
          <Button size="sm" asChild>
            <Link to="/login">{t("navigation.login")}</Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MenuIcon />
                <span className="sr-only">Menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              {navigationData.map((item, index) => (
                <DropdownMenuItem key={index} asChild>
                  <a href={item.href}>{item.title}</a>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default LandingHeader;
