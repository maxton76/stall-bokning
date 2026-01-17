import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import {
  supportedLanguages,
  languageNames,
  languageFlags,
  type SupportedLanguage,
} from "@/i18n";

/**
 * Language switcher component that allows users to change the application language.
 * Uses i18next for language management and persists the choice to localStorage.
 */
export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const currentLang = (i18n.language || "sv") as SupportedLanguage;
  const currentFlag = languageFlags[currentLang] || languageFlags.sv;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <span className="text-base">{currentFlag}</span>
          <span className="sr-only">Change language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={i18n.language}
          onValueChange={handleLanguageChange}
        >
          {supportedLanguages.map((lang) => (
            <DropdownMenuRadioItem key={lang} value={lang}>
              <span className="mr-2">{languageFlags[lang]}</span>
              {languageNames[lang]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Compact language switcher that shows only the flag.
 * Useful for sidebars or tight spaces.
 */
export function LanguageSwitcherCompact() {
  const { i18n } = useTranslation();

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const currentLang = (i18n.language || "sv") as SupportedLanguage;
  const currentFlag = languageFlags[currentLang] || languageFlags.sv;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2 gap-1">
          <span>{currentFlag}</span>
          <Globe className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={i18n.language}
          onValueChange={handleLanguageChange}
        >
          {supportedLanguages.map((lang) => (
            <DropdownMenuRadioItem key={lang} value={lang}>
              <span className="mr-2">{languageFlags[lang]}</span>
              {languageNames[lang]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default LanguageSwitcher;
