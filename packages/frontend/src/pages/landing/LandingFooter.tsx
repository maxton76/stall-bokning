import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  FacebookIcon,
  InstagramIcon,
  TwitterIcon,
  YoutubeIcon,
} from "lucide-react";

import { Separator } from "@/components/ui/separator";
import Logo from "@/components/shadcn-studio/logo";

const LandingFooter = () => {
  const { t } = useTranslation("landing");

  return (
    <footer className="bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main footer content */}
        <div className="py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand column */}
          <div className="md:col-span-1">
            <Link to="/">
              <Logo className="gap-3 mb-4" />
            </Link>
            <p className="text-sm text-muted-foreground">
              {t("footer.description")}
            </p>
            <div className="flex items-center gap-4 mt-4">
              <a
                href="#"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <FacebookIcon className="size-5" />
              </a>
              <a
                href="#"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <InstagramIcon className="size-5" />
              </a>
              <a
                href="#"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <TwitterIcon className="size-5" />
              </a>
              <a
                href="#"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <YoutubeIcon className="size-5" />
              </a>
            </div>
          </div>

          {/* Product column */}
          <div>
            <h3 className="font-semibold mb-4">{t("footer.product.title")}</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="#features"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {t("footer.product.features")}
                </a>
              </li>
              <li>
                <a
                  href="#pricing"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {t("footer.product.pricing")}
                </a>
              </li>
              <li>
                <a
                  href="#documentation"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {t("footer.product.documentation")}
                </a>
              </li>
            </ul>
          </div>

          {/* Company column */}
          <div>
            <h3 className="font-semibold mb-4">{t("footer.company.title")}</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/about"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {t("footer.company.about")}
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {t("footer.company.contact")}
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {t("footer.company.privacy")}
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {t("footer.company.terms")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Support column */}
          <div>
            <h3 className="font-semibold mb-4">{t("footer.support.title")}</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/help"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {t("footer.support.help")}
                </Link>
              </li>
              <li>
                <Link
                  to="/docs"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {t("footer.support.guides")}
                </Link>
              </li>
              <li>
                <Link
                  to="/docs/api"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {t("footer.support.api")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <Separator />

        {/* Copyright */}
        <div className="py-6 text-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} {t("footer.copyright")}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
