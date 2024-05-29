// Based on obsidian-dictionary localization
// Language names are based on @formatjs/intl-displaynames
import { moment } from "obsidian";

import ar from "./locale/ar";
import be from "./locale/be";
import bg from "./locale/bg";
import ca from "./locale/ca";
import cs from "./locale/cs";
import da from "./locale/da";
import de from "./locale/de";
import el from "./locale/el";
import en from "./locale/en";
import enGB from "./locale/en-gb";
import es from "./locale/es";
import eu from "./locale/eu";
import fa from "./locale/fa";
import fr from "./locale/fr";
import hi from "./locale/hi";
import id from "./locale/id";
import it from "./locale/it";
import ja from "./locale/ja";
import ko from "./locale/ko";
import ml from "./locale/ml";
import ms from "./locale/ms";
import nl from "./locale/nl";
import no from "./locale/no";
import pl from "./locale/pl";
import pt from "./locale/pt";
import ptBR from "./locale/pt-br";
import ro from "./locale/ro";
import ru from "./locale/ru";
import se from "./locale/se";
import sk from "./locale/sk";
import sq from "./locale/sq";
import sr from "./locale/sr";
import th from "./locale/th";
import tm from "./locale/tm";
import tr from "./locale/tr";
import uk from "./locale/uk";
import ur from "./locale/ur";
import vi from "./locale/vi";
import zhCN from "./locale/zh-cn";
import zhTW from "./locale/zh-tw";

// Supported Obsidian languages
const locales: { [key: string]: Partial<typeof en> } = {
	ar,
	be,
	bg,
	ca,
	cs,
	da,
	de,
	el,
	en,
	"en-gb": enGB,
	es,
	eu,
	fa,
	fr,
	hi,
	id,
	it,
	ja,
	ko,
	ml,
	ms,
	nl,
	no,
	pl,
	pt,
	"pt-br": ptBR,
	ro,
	ru,
	se,
	sk,
	sq,
	sr,
	th,
	tm,
	tr,
	uk,
	ur,
	vi,
	"zh-cn": zhCN,
	"zh-tw": zhTW,
};

const locale: { [key: string]: string } = locales[moment.locale()];

export default function t(str: string): string {
	if (!locale)
		console.error("Error: translator locale not found", moment.locale());

	return (locale && locale[str]) || en[str as keyof typeof en] || str;
}
