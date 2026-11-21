const fs = require('fs');
const path = require('path');

const OFFLINE_PROTOCOLS = [
  {
    id: "snakebite",
    icon: "🐍",
    title: {
      en: "Snakebite Emergency Protocol",
      or: "ସାପ କାମୁଡ଼ା ଜରୁରୀକାଳୀନ ଚିକିତ୍ସା",
      hi: "सांप काटने का आपातकालीन प्रोटोकॉल"
    },
    urgency: "CRITICAL",
    summary: {
      en: "Immediate hospital transfer required for Anti-Snake Venom (ASV). Minutes count.",
      or: "ତୁରନ୍ତ ସରକାରୀ ହସ୍ପିଟାଲ ନେଇ Anti-Snake Venom (ASV) ଇଞ୍ଜେକ୍ସନ ଦିଅନ୍ତୁ । ପ୍ରତି ମିନିଟ୍ ମୂଲ୍ୟବାନ ।",
      hi: "एंटी-स्नेक वेनम (ASV) के लिए तुरंत अस्पताल ले जाएं। समय बहुत कीमती है।"
    },
    dos: {
      en: [
        "Keep patient calm, lying down, and completely still.",
        "Immobilize the bitten limb using a rigid splint or cloth sling below heart level.",
        "Remove rings, anklets, bracelets, and tight clothing before swelling starts.",
        "Immediately call 108 for an ambulance or transport to nearest CHC/DHH.",
        "Note time of bite and snake features if seen safely (do NOT try to catch it)."
      ],
      or: [
        "ରୋଗୀଙ୍କୁ ଶାନ୍ତ ରଖନ୍ତୁ ଓ ସମ୍ପୂର୍ଣ୍ଣ ସ୍ଥିର ଭାବେ ଶୁଆଇ ରଖନ୍ତୁ ।",
        "କାମୁଡ଼ା ହୋଇଥିବା ହାତ ବା ଗୋଡ଼କୁ କାଠି/ପଟି ବାନ୍ଧି ହୃଦୟର ସ୍ତରଠାରୁ ତଳକୁ ସ୍ଥିର ରଖନ୍ତୁ ।",
        "ଫୁଲିବା ଆରମ୍ଭ ହେବା ପୂର୍ବରୁ ମୁଦି, ଝୁଣ୍ଟିଆ, ଚୁଡ଼ି ଓ କଷା ପୋଷାକ ଖୋଲିଦିଅନ୍ତୁ ।",
        "ତୁରନ୍ତ ୧୦୮ କୁ କଲ୍ କରନ୍ତୁ ବା ନିକଟସ୍ଥ CHC/DHH କୁ ଶୀଘ୍ର ନିଅନ୍ତୁ ।",
        "ସାପର ରଙ୍ଗ ବା ଚିହ୍ନ ମନେ ରଖନ୍ତୁ (କିନ୍ତୁ ସାପ ଧରିବାକୁ ଚେଷ୍ଟା କରନ୍ତୁ ନାହିଁ) ।"
      ],
      hi: [
        "मरीज को शांत रखें और बिल्कुल स्थिर लेटा कर रखें।",
        "काटे हुए हाथ या पैर को बिना हिलाए लकड़ी या कपड़े के सहारे हृदय के स्तर से नीचे रखें।",
        "सूजन शुरू होने से पहले अंगूठी, बिछिया, कड़े और तंग कपड़े तुरंत उतार दें।",
        "तुरंत 108 पर कॉल करें या नजदीकी सरकारी अस्पताल (CHC/DHH) ले जाएं।",
        "सांप का रंग या रूप याद रखें (किंतु उसे पकड़ने की कोशिश न करें)।"
      ]
    },
    donts: {
      en: [
        "NEVER cut the wound or make incisions (causes severe bleeding).",
        "NEVER attempt to suck venom by mouth or suction device.",
        "NEVER tie a tight rope/wire tourniquet (cuts circulation, causes gangrene and limb loss).",
        "NEVER apply electric shock, ice, cow dung, mud, or herbal pastes.",
        "NEVER waste critical time visiting traditional healers, gunias, or quacks."
      ],
      or: [
        "କଦାପି କ୍ଷତ ସ୍ଥାନକୁ ବ୍ଲେଡ୍ ବା ଛୁରୀରେ କାଟନ୍ତୁ ନାହିଁ (ଭୟଙ୍କର ରକ୍ତସ୍ରାବ ହୁଏ) ।",
        "କଦାପି ପାଟିରେ ବିଷ ଶୋଷିବାକୁ ଚେଷ୍ଟା କରନ୍ତୁ ନାହିଁ ।",
        "କଦାପି ଦଉଡ଼ି ବା ତାରରେ କଷିକରି ବାନ୍ଧନ୍ତୁ ନାହିଁ (ରକ୍ତ ଚଳାଚଳ ବନ୍ଦ ହୋଇ ଅଙ୍ଗ ସଢ଼ିଯାଏ) ।",
        "କଦାପି ବରଫ, ଗୋବର, ମାଟି ବା ଜଡ଼ିବୁଟି ଲେପ ଦିଅନ୍ତୁ ନାହିଁ ।",
        "କଦାପି ଗୁଣିଆ ବା ଝାଡ଼ଫୁଙ୍କ କରି ଅମୂଲ୍ୟ ସମୟ ନଷ୍ଟ କରନ୍ତୁ ନାହିଁ ।"
      ],
      hi: [
        "घाव पर कभी ब्लेड या चाकू से चीरा न लगाएं (गंभीर रक्तस्राव होता है)।",
        "मुंह से कभी जहर चूसने का प्रयास न करें।",
        "रस्सी या तार से कसकर टूनिकेट कभी न बांधें (रक्त प्रवाह रुकने से अंग काटना पड़ सकता है)।",
        "बर्फ, गोबर, मिट्टी या कोई जड़ी-बूटी कभी न लगाएं।",
        "झाड़-फूंक या तांत्रिक के पास जाकर कीमती समय कभी बर्बाद न करें।"
      ]
    },
    helpline: "108",
    keywords: ["snake", "snakebite", "poison", "venom", "viper", "krait", "cobra", "ସାପ", "ବିଷ", "ନାଗ", "ଚନ୍ଦନବୋଡ଼ା", "ବାଉଁଶରାଣୀ", "କାମୁଡ଼ା", "सांप", "सर्प", "जहर", "काटना"]
  },
  {
    id: "diarrhea",
    icon: "💧",
    title: {
      en: "Acute Diarrhea & Dehydration (WHO ORS)",
      or: "ତରଳ ଝାଡ଼ା ଓ ନିର୍ଜଳନ (WHO ORS ପଦ୍ଧତି)",
      hi: "दस्त और गंभीर निर्जलीकरण (WHO ORS)"
    },
    urgency: "HIGH",
    summary: {
      en: "Prevention of fatal dehydration via WHO ORS and Zinc. Strictly NO unprescribed antibiotics.",
      or: "ଜୀବନ ରକ୍ଷାକାରୀ WHO ORS ଏବଂ ଜିଙ୍କ୍ ଉପଚାର । ବିନା ଡାକ୍ତରୀ ପରାମର୍ଶରେ ଆଣ୍ଟିବାୟୋଟିକ୍ ଖାଆନ୍ତୁ ନାହିଁ ।",
      hi: "जीवनरक्षक WHO ORS और जिंक। बिना डॉक्टर की सलाह के एंटीबायोटिक बिल्कुल न लें।"
    },
    dos: {
      en: [
        "Mix 1 full packet of WHO ORS into exactly 1 Liter of clean boiled & cooled water.",
        "Give small frequent sips after every loose stool (Children: 50-100ml, Adults: 200-400ml).",
        "Emergency homemade solution (if no packet): 1 Liter clean water + 6 level teaspoons sugar + 1/2 teaspoon salt.",
        "Continue regular breastfeeding and light soft meals (khichdi, banana, coconut water).",
        "Give Zinc tablets (20mg daily) for 14 days to children under 5 to restore intestinal lining."
      ],
      or: [
        "୧ ପ୍ୟାକେଟ୍ WHO ORS କୁ ଠିକ୍ ୧ ଲିଟର ଫୁଟା ଥଣ୍ଡା ପାଣିରେ ସମ୍ପୂର୍ଣ୍ଣ ଗୋଳାନ୍ତୁ ।",
        "ପ୍ରତିଥର ଝାଡ଼ା ପରେ ଧୀରେ ଧୀରେ ଚାମଚରେ ପିଆନ୍ତୁ (ଶିଶୁ: ୫୦-୧୦୦ମିଲି, ବଡ଼ମଣିଷ: ୨୦୦-୪୦୦ମିଲି) ।",
        "ଘରୋଇ ଜରୁରୀ ପାନୀୟ (ପ୍ୟାକେଟ୍ ନଥିଲେ): ୧ ଲିଟର ପାଣି + ୬ ଚାମଚ ଚିନି + ଅଧା ଚାମଚ ଲୁଣ ।",
        "ମାତୃସ୍ତନ୍ୟ ଦୁଗ୍ଧ ଏବଂ ନରମ ଖାଦ୍ୟ (ଜାଉ, ଖେଚୁଡ଼ି, କଦଳୀ, ଡାବ ପାଣି) ବନ୍ଦ କରନ୍ତୁ ନାହିଁ ।",
        "୫ ବର୍ଷରୁ କମ୍ ପିଲାଙ୍କୁ ପୂରା ୧୪ ଦିନ ପର୍ଯ୍ୟନ୍ତ ଦୈନିକ ୨୦ ମିଗ୍ରା ଜିଙ୍କ୍ ବଟିକା ଖୁଆନ୍ତୁ ।"
      ],
      hi: [
        "1 पैकेट WHO ORS को ठीक 1 लीटर उबले और ठंडे पानी में अच्छी तरह घोलें।",
        "हर बार दस्त के बाद थोड़ा-थोड़ा पिलाएं (बच्चे: 50-100ml, वयस्क: 200-400ml)।",
        "घरेलू आपातकालीन घोल: 1 लीटर पानी + 6 चम्मच चीनी + 1/2 चम्मच नमक।",
        "स्तनपान और हल्का भोजन (खिचड़ी, केला, नारियल पानी) जारी रखें।",
        "5 साल से कम उम्र के बच्चों को पूरे 14 दिन तक रोजाना 20mg जिंक की गोली दें।"
      ]
    },
    donts: {
      en: [
        "DO NOT give unprescribed antibiotics or antimotility pills (Loperamide/Norflox-TZ).",
        "DO NOT dilute ORS with milk, tea, juice, or sweetened aerated drinks.",
        "DO NOT stop breastfeeding or withhold food from a sick child."
      ],
      or: [
        "କଦାପି ବିନା ଡାକ୍ତରୀ ପ୍ରେସକ୍ରିପସନରେ ଆଣ୍ଟିବାୟୋଟିକ୍ ବା ଝାଡ଼ା ବନ୍ଦ ଔଷଧ (Loperamide) ଖାଆନ୍ତୁ ନାହିଁ ।",
        "କଦାପି ORS କୁ କ୍ଷୀର, ଚାହା, କୋଲ୍ଡ ଡ୍ରିଙ୍କ୍ସ ବା ମିଠା ରସରେ ଗୋଳାନ୍ତୁ ନାହିଁ ।",
        "ଅସୁସ୍ଥ ଶିଶୁକୁ ମାତୃସ୍ତନ୍ୟ ଦୁଗ୍ଧ ବା ଖାଦ୍ୟ ଦେବାରୁ କେବେ ବଞ୍ଚିତ କରନ୍ତୁ ନାହିଁ ।"
      ],
      hi: [
        "बिना डॉक्टर के पर्चे के एंटीबायोटिक या दस्त रोकने वाली दवाएं (Loperamide) न लें।",
        "ORS को दूध, चाय, जूस या कोल्ड ड्रिंक्स में न घोलें।",
        "बीमार बच्चे का स्तनपान या भोजन कभी बंद न करें।"
      ]
    },
    helpline: "104",
    keywords: ["diarrhea", "dehydration", "ors", "vomiting", "loose motions", "stomach infection", "zinc", "ଝାଡ଼ା", "ବାନ୍ତି", "ପତଳା ଝାଡ଼ା", "ନିର୍ଜଳନ", "ଓଆରଏସ", "ଜଳଶୂନ୍ୟତା", "दस्त", "उल्टी", "ओआरएस", "निर्जलीकरण"]
  },
  {
    id: "heatstroke",
    icon: "☀️",
    title: {
      en: "Heatstroke & Loo Emergency",
      or: "ଅଂଶୁଘାତ (ଲୁ) ଜରୁରୀକାଳୀନ ପ୍ରାଥମିକ ଚିକିତ୍ସା",
      hi: "लू लगना व हीटस्ट्रोक आपातकालीन उपचार"
    },
    urgency: "CRITICAL",
    summary: {
      en: "Rapid cooling protocol to prevent fatal brain and organ damage during extreme heat.",
      or: "ଅତ୍ୟଧିକ ଖରା ଓ ତାତି ଯୋଗୁଁ ମସ୍ତିଷ୍କ ଓ ଶରୀରକୁ ସୁରକ୍ଷା ଦେବା ପାଇଁ ତୁରନ୍ତ ଥଣ୍ଡା କରିବା ପ୍ରୋଟୋକଲ୍ ।",
      hi: "अत्यधिक गर्मी में मस्तिष्क और अंगों को नुकसान से बचाने हेतु त्वरित शीतलन प्रोटोकॉल।"
    },
    dos: {
      en: [
        "Immediately move victim to a shaded, well-ventilated, or fan-cooled area.",
        "Remove or loosen tight and heavy clothing.",
        "Sponge the entire body continuously with cool tap water.",
        "Place cold damp cloths or ice packs on neck, armpits, and groin.",
        "Fan vigorously. If alert, give cool water with ORS or coconut water.",
        "Call 108 if body temperature exceeds 104°F, or if patient is delirious or unconscious."
      ],
      or: [
        "ରୋଗୀଙ୍କୁ ତୁରନ୍ତ ଖରାରୁ ଆଣି ଛାଇ, ପବନ ଚଳାଚଳ ଥିବା ଥଣ୍ଡା ସ୍ଥାନରେ ଶୁଆନ୍ତୁ ।",
        "ପୋଷାକ ଢିଲା କରନ୍ତୁ ବା ଅତ୍ୟଧିକ ପୋଷାକ କାଢ଼ିଦିଅନ୍ତୁ ।",
        "ସାରା ଶରୀରରେ ସାଧାରଣ ଥଣ୍ଡା ପାଣି ପଟି ପକାଇ ସ୍ପଞ୍ଜ କରନ୍ତୁ ।",
        "ବେକ, କାଖ ଓ ଜଙ୍ଘ ମୂଳରେ ଥଣ୍ଡା ପାଣି ପଟି ରଖନ୍ତୁ ।",
        "ଜୋରରେ ପଙ୍ଖା କରନ୍ତୁ । ଚେତା ଥିଲେ ଥଣ୍ଡା ପାଣିରେ ORS, ଲେମ୍ବୁ ପାଣି ବା ଡାବ ପାଣି ଦିଅନ୍ତୁ ।",
        "ଜ୍ୱର ୧୦୪°F ରୁ ଅଧିକ ହେଲେ କିମ୍ବା ବାତ ମାରିଲେ ତୁରନ୍ତ ୧୦୮ କୁ କଲ୍ କରନ୍ତୁ ।"
      ],
      hi: [
        "मरीज को तुरंत धूप से हटाकर छायादार और हवादार स्थान पर ले जाएं।",
        "मरीज के तंग और भारी कपड़े ढीले करें या उतार दें।",
        "पूरे शरीर पर ठंडे सामान्य पानी की पट्टियां रखकर लगातार स्पंज करें।",
        "गर्दन, बगल और जांघों के जोड़ों पर ठंडे पानी की पट्टियां रखें।",
        "लगातार पंखा चलाएं। होश में होने पर ओआरएस या नींबू-नमक का पानी पिलाएं।",
        "बुखार 104°F से अधिक होने या बेहोश होने पर तुरंत 108 पर एम्बुलेंस बुलाएं।"
      ]
    },
    donts: {
      en: [
        "DO NOT give oral fluids to an unconscious, seizing, or vomiting person.",
        "DO NOT give Paracetamol/Aspirin for heatstroke (ineffective and can harm liver).",
        "DO NOT plunge patient into ice water."
      ],
      or: [
        "ଅଚେତ, ବାତ ମାରୁଥିବା ବା ବାନ୍ତି କରୁଥିବା ରୋଗୀଙ୍କୁ କଦାପି ପାଣି ପିଇବାକୁ ଦିଅନ୍ତୁ ନାହିଁ ।",
        "ଅଂଶୁଘାତ ପାଇଁ ପାରାସିଟାମଲ ବା ଆସ୍ପିରିନ୍ ଦିଅନ୍ତୁ ନାହିଁ (ଏହା ଯକୃତ ପାଇଁ ହାନିକାରକ) ।",
        "ରୋଗୀଙ୍କୁ ସିଧାସଳଖ ବରଫ ପାଣିରେ ବୁଡ଼ାନ୍ତୁ ନାହିଁ ।"
      ],
      hi: [
        "बेहोश या उल्टी कर रहे व्यक्ति के मुंह में पानी या कोई तरल बिल्कुल न डालें।",
        "लू लगने पर पैरासिटामोल या एस्पिरिन न दें।",
        "मरीज को सीधे बर्फ के पानी में न डुबोएं।"
      ]
    },
    helpline: "108",
    keywords: ["heat", "heatstroke", "loo", "sunstroke", "extreme heat", "summer fever", "ଅଂଶୁଘାତ", "ଲୁ", "ଖରା", "ଗରମ", "ତାତି", "लू", "हीटस्ट्रोक", "गर्मी", "धूप"]
  },
  {
    id: "pregnancy",
    icon: "🤰",
    title: {
      en: "Maternal Red Flags in Pregnancy",
      or: "ଗର୍ଭାବସ୍ଥାରେ ଜରୁରୀକାଳୀନ ବିପଦ ଲକ୍ଷଣ",
      hi: "गर्भावस्था में आपातकालीन खतरे के संकेत"
    },
    urgency: "CRITICAL",
    summary: {
      en: "Immediate emergency transport via 108 or Janani Express 102. Saves mother and child.",
      or: "୧୦୮ ବା ଜନନୀ ଏକ୍ସପ୍ରେସ୍ ୧୦୨ ଦ୍ୱାରା ତୁରନ୍ତ ଡାକ୍ତରଖାନା ସ୍ଥାନାନ୍ତର । ମାତା ଓ ଶିଶୁର ଜୀବନ ରକ୍ଷା ।",
      hi: "108 या जननी एक्सप्रेस 102 द्वारा तुरंत अस्पताल ले जाएं। मां और बच्चे की जान बचाएं।"
    },
    dos: {
      en: [
        "Any vaginal bleeding requires immediate hospital transfer.",
        "Severe persistent headache, blurred vision, or facial swelling indicates high blood pressure (Eclampsia).",
        "Lie the mother on her LEFT side to optimize blood flow to fetus.",
        "Call 108 (Ambulance) or 102 (Janani Express) immediately.",
        "Keep Mother and Child Protection (MCP) card ready."
      ],
      or: [
        "ଗର୍ଭାବସ୍ଥାରେ କିମ୍ବା ପ୍ରସବ ପରେ ଯେକୌଣସି ରକ୍ତସ୍ରାବ ଦେଖାଦେଲେ ତୁରନ୍ତ ଡାକ୍ତରଖାନା ନିଅନ୍ତୁ ।",
        "ଅତ୍ୟଧିକ ମୁଣ୍ଡବିନ୍ଧା, ଆଖିକୁ ଝାପ୍‌ସା ଦେଖାଯିବା, ମୁହଁ ଓ ହାତ ଫୁଲିବା (ଉଚ୍ଚ ରକ୍ତଚାପ/ବାତର ଲକ୍ଷଣ) ।",
        "ଗର୍ଭବତୀ ମାତାଙ୍କୁ ବାମ କଡ଼ ମାଡ଼ି ଶୁଆନ୍ତୁ ଯାହାଦ୍ୱାରା ଶିଶୁକୁ ଠିକ୍ ଭାବେ ରକ୍ତ ଚଳାଚଳ ହେବ ।",
        "ତୁରନ୍ତ ୧୦୮ (ଆମ୍ବୁଲାନ୍ସ) ବା ୧୦୨ (ଜନନୀ ଏକ୍ସପ୍ରେସ୍) କୁ ଫୋନ୍ କରନ୍ତୁ ।",
        "ମମତା/ମାତୃ ସୁରକ୍ଷା କାର୍ଡ଼ (MCP Card) ସାଙ୍ଗରେ ନିଅନ୍ତୁ ।"
      ],
      hi: [
        "गर्भावस्था या प्रसव के बाद कोई भी रक्तस्राव होने पर तुरंत अस्पताल ले जाएं।",
        "तेज सिरदर्द, धुंधला दिखना, चेहरे पर सूजन उच्च रक्तचाप का संकेत है।",
        "गर्भवती महिला को बाईं करवट लिटाएं।",
        "तुरंत 108 (एम्बुलेंस) या 102 (जननी एक्सप्रेस) पर फोन करें।",
        "मातृ एवं शिशु सुरक्षा (MCP) कार्ड साथ रखें।"
      ]
    },
    donts: {
      en: [
        "DO NOT delay seeking care if baby stops moving for 12 hours.",
        "DO NOT attempt unassisted home delivery if high-risk signs are present.",
        "DO NOT consume unverified herbal concoctions."
      ],
      or: [
        "ଶିଶୁର ଚଳପ୍ରଚଳ ୧୨ ଘଣ୍ଟା ଧରି ବନ୍ଦ ଥିଲେ ଆଦୌ ବିଳମ୍ବ କରନ୍ତୁ ନାହିଁ ।",
        "ବିପଦ ଲକ୍ଷଣ ଥିଲେ କଦାପି ଘରେ ପ୍ରସବ କରାଇବାକୁ ଚେଷ୍ଟା କରନ୍ତୁ ନାହିଁ ।",
        "ବେଦନା କମାଇବା ପାଇଁ କୌଣସି ଜଡ଼ିବୁଟି ବା କାଢ଼ା ପିଇବାକୁ ଦିଅନ୍ତୁ ନାହିଁ ।"
      ],
      hi: [
        "यदि बच्चा 12 घंटे तक न हिले तो जरा भी देरी न करें।",
        "खतरे के संकेत होने पर कभी भी घर पर प्रसव कराने का जोखिम न लें।"
      ]
    },
    helpline: "108",
    keywords: ["pregnancy", "pregnant", "bleeding", "labor", "delivery", "maternal", "baby movement", "preeclampsia", "ଗର୍ଭବତୀ", "ରକ୍ତସ୍ରାବ", "ପ୍ରସବ", "ମାତୃ", "ଶିଶୁ ଚଳନ", "ଗର୍ଭ", "गर्भावस्था", "गर्भवती", "प्रसव", "रक्तस्राव"]
  },
  {
    id: "chestpain",
    icon: "❤️",
    title: {
      en: "Chest Pain & Suspected Heart Attack",
      or: "ଛାତି ଯନ୍ତ୍ରଣା ଓ ହୃଦଘାତ ଆପାତକାଳୀନ ପଦକ୍ଷେପ",
      hi: "सीने में दर्द व संभावित दिल का दौरा"
    },
    urgency: "CRITICAL",
    summary: {
      en: "0ms emergency referral to 108 ambulance with Golden Hour cardiac rest.",
      or: "ଗୋଲ୍ଡେନ୍ ଆୱାର୍ ହୃଦ୍‌ରୋଗ ସୁରକ୍ଷା ପାଇଁ ତୁରନ୍ତ ୧୦୮ କୁ କଲ୍ ଏବଂ ସମ୍ପୂର୍ଣ୍ଣ ବିଶ୍ରାମ ।",
      hi: "गोल्डन ऑवर में 108 एम्बुलेंस को कॉल और पूर्ण आराम।"
    },
    dos: {
      en: [
        "Have patient stop all activity and sit upright in comfortable supported posture (W-sitting).",
        "Loosen collar, tie, belt, and tight clothing.",
        "If not allergic and advised, have adult chew one 300mg Soluble Aspirin/Disprin.",
        "Immediately call 108 for an ambulance.",
        "If person stops breathing normally, start CPR (30 chest compressions at 100-120 bpm)."
      ],
      or: [
        "ରୋଗୀଙ୍କ ସମସ୍ତ ଚଳପ୍ରଚଳ ବନ୍ଦ କରାଇ ଆଉଜି ବସାନ୍ତୁ (W-position) ।",
        "କଲର, ବେଲ୍ଟ ଓ କଷା ପୋଷାକ ଢିଲା କରନ୍ତୁ ।",
        "ଯଦି ଆଲର୍ଜି ନାହିଁ, ୩୦୦ ମିଗ୍ରା ଆସ୍ପିରିନ୍ (Disprin) ବଟିକା ଚୋବାଇ ଖାଇବାକୁ ଦିଅନ୍ତୁ ।",
        "ତୁରନ୍ତ ୧୦୮ ଆମ୍ବୁଲାନ୍ସକୁ କଲ୍ କରନ୍ତୁ ।",
        "ରୋଗୀ ଅଚେତ ହୋଇ ଶ୍ୱାସକ୍ରିୟା ବନ୍ଦ ହେଲେ ତୁରନ୍ତ CPR ଆରମ୍ଭ କରନ୍ତୁ ।"
      ],
      hi: [
        "मरीज की सारी हलचल रोकें और पीठ को सहारा देकर आराम से बैठाएं।",
        "कॉलर, बेल्ट और तंग कपड़े ढीले करें।",
        "यदि एलर्जी न हो, तो 300mg एस्पिरिन (डिस्प्रिन) की एक गोली चबाने को दें।",
        "तुरंत 108 पर एम्बुलेंस बुलाएं।"
      ]
    },
    donts: {
      en: [
        "DO NOT let the patient walk, climb stairs, or exert themselves.",
        "DO NOT assume it is mere \"gas\" if accompanied by cold sweat and arm pain."
      ],
      or: [
        "ରୋଗୀଙ୍କୁ ଆଦୌ ଚାଲିବାକୁ ବା ସିଡ଼ି ଚଢ଼ିବାକୁ ଦିଅନ୍ତୁ ନାହିଁ ।",
        "ପ୍ରବଳ ଝାଳ ବୋହିବା ଓ ବାମ ହାତ ଯନ୍ତ୍ରଣା ଥିଲେ ଏହାକୁ କେବଳ ଗ୍ୟାସ ଭାବି ଅଣଦେଖା କରନ୍ତୁ ନାହିଁ ।"
      ],
      hi: [
        "मरीज को चलने, सीढ़ी चढ़ने बिल्कुल न दें।",
        "पसीने के साथ दर्द को केवल गैस मानकर नजरअंदाज न करें।"
      ]
    },
    helpline: "108",
    keywords: ["chest pain", "heart attack", "heart", "cardiac", "left arm pain", "sweating", "angina", "ଛାତି ଯନ୍ତ୍ରଣା", "ହୃଦଘାତ", "ହାର୍ଟ ଆଟାକ", "ବାମ ହାତ ବିନ୍ଧା", "ଛାତି", "सीने में दर्द", "हार्ट अटैक", "दिल का दौरा"]
  },
  {
    id: "burns",
    icon: "🔥",
    title: {
      en: "Burn Injuries & Scalds First Aid",
      or: "ପୋଡ଼ିଯିବା ଆଘାତର ପ୍ରାଥମିକ ଚିକିତ୍ସା",
      hi: "जलने व झुलसने पर प्राथमिक उपचार"
    },
    urgency: "HIGH",
    summary: {
      en: "20 minutes continuous cool tap water. Strictly avoid toothpaste, ink, or turmeric.",
      or: "ଲଗାତାର ୨୦ ମିନିଟ୍ ସାଧାରଣ ଥଣ୍ଡା ପାଣି ଢାଳନ୍ତୁ । କଦାପି କାଳି, କୋଲଗେଟ୍ ବା ହଳଦୀ ଲଗାନ୍ତୁ ନାହିଁ ।",
      hi: "लगातार 20 मिनट तक नल का ठंडा पानी डालें। टूथपेस्ट, स्याही या हल्दी बिल्कुल न लगाएं।"
    },
    dos: {
      en: [
        "Pour clean, cool running tap water continuously over the burn for at least 15 to 20 minutes.",
        "Gently remove rings, jewelry, and loose clothing before the burnt area swells.",
        "Cover loosely with a clean, sterile cloth.",
        "Seek urgent medical care at nearest CHC/DHH burn unit."
      ],
      or: [
        "ପୋଡ଼ିଯାଇଥିବା ସ୍ଥାନ ଉପରେ ଅତିକମରେ ୧୫ ରୁ ୨୦ ମିନିଟ୍ ଧରି ନଳକୂଅ ବା ଟ୍ୟାପ୍ ର ସଫା ଥଣ୍ଡା ପାଣି ଢାଳନ୍ତୁ ।",
        "ଫୁଲିବା ପୂର୍ବରୁ ଆଘାତ ପାଖରେ ଥିବା ମୁଦି, ଚୁଡ଼ି ଓ ଢିଲା ପୋଷାକ ସାବଧାନରେ ଖୋଲିଦିଅନ୍ତୁ ।",
        "ସଂକ୍ରମଣରୁ ରକ୍ଷା ପାଇଁ ପରିଷ୍କାର ସଫା କପଡ଼ାରେ ଢିଲା ଭାବେ ଘୋଡ଼ାଇ ରଖନ୍ତୁ ।",
        "ତୁରନ୍ତ ନିକଟସ୍ଥ CHC/DHH ର ବର୍ଣ୍ଣ ୱାର୍ଡ଼କୁ ନିଅନ୍ତୁ ।"
      ],
      hi: [
        "जले हुए स्थान पर कम से कम 15 से 20 मिनट तक नल का साफ ठंडा पानी लगातार डालें।",
        "अंगूठी, कड़े और ढीले कपड़े सूजन आने से पहले उतार दें।",
        "संक्रमण से बचाने के लिए साफ सूखे कपड़े से ढकें।",
        "नजदीकी अस्पताल तुरंत ले जाएं।"
      ]
    },
    donts: {
      en: [
        "DO NOT apply toothpaste, ink, engine oil, turmeric, cow dung, or butter.",
        "DO NOT use freezing ice or ice water.",
        "DO NOT pop or prick burn blisters."
      ],
      or: [
        "କଦାପି କୋଲଗେଟ୍/ଟୁଥପେଷ୍ଟ, କାଳି, ତେଲ, ହଳଦୀ, ଗୋବର ବା ଘିଅ ଲଗାନ୍ତୁ ନାହିଁ ।",
        "କଦାପି ବରଫ ଲଗାନ୍ତୁ ନାହିଁ ।",
        "କଦାପି ପୋଡ଼ା ଫୋଟକାକୁ ଫୁଟାନ୍ତୁ ନାହିଁ ।"
      ],
      hi: [
        "टूथपेस्ट, स्याही, तेल, हल्दी, गोबर कभी न लगाएं।",
        "बर्फ का सीधा इस्तेमाल न करें।",
        "जले के छालों को न फोड़ें।"
      ]
    },
    helpline: "108",
    keywords: ["burn", "burns", "scald", "fire", "hot water", "electric burn", "ପୋଡ଼ିଯିବା", "ନିଆଁ", "ଗରମ ପାଣି", "ଜଳାପୋଡ଼ା", "ଫୋଟକା", "जलना", "झुलसना", "आग", "छाला"]
  },
  {
    id: "dogbite",
    icon: "🐕",
    title: {
      en: "Dog Bite & Rabies Prevention Protocol",
      or: "କୁକୁର କାମୁଡ଼ା ଓ ରେବିସ୍ ସୁରକ୍ଷା ପ୍ରୋଟୋକଲ୍",
      hi: "कुत्ता काटना व रेबीज रोकथाम"
    },
    urgency: "HIGH",
    summary: {
      en: "15-minute continuous soap water wash + urgent Anti-Rabies Vaccine (ARV).",
      or: "୧୫ ମିନିଟ୍ ସାବୁନ ଓ ଟ୍ୟାପ୍ ପାଣିରେ ଧୋଇବା + ତୁରନ୍ତ ଡାକ୍ତରଖାନାରେ ଆଣ୍ଟି-ରେବିସ୍ ଟିକା (ARV) ।",
      hi: "15 मिनट तक साबुन-पानी से लगातार धोएं + तुरंत एंटी-रेबीज टीका (ARV) लगवाएं।"
    },
    dos: {
      en: [
        "Immediately wash bite wound under running tap water with soap for a FULL 15 MINUTES.",
        "Washing removes over 80% of rabies virus particles before they bind to nerves.",
        "Apply povidone-iodine (Betadine) antiseptic if available.",
        "Rush to nearest government CHC/DHH for full 4-dose Anti-Rabies Vaccine (ARV) regimen."
      ],
      or: [
        "କାମୁଡ଼ା ବା ଆଞ୍ଚୁଡ଼ା ସ୍ଥାନକୁ ତୁରନ୍ତ ଟ୍ୟାପ୍ ର ଚାଲୁଥିବା ପାଣି ଏବଂ ସାବୁନରେ ପୂରା ୧୫ ମିନିଟ୍ ଧରି ଲଗାତାର ଧୁଅନ୍ତୁ ।",
        "ଏହି ୧୫ ମିନିଟ୍ ଧୋଇବା ଦ୍ୱାରା ୮୦% ରୁ ଅଧିକ ରେବିସ୍ ଭାଇରସ୍ ନଷ୍ଟ ହୋଇଯାଏ ।",
        "ଉପଲବ୍ଧ ଥିଲେ ପୋଭିଡୋନ୍-ଆୟୋଡିନ୍ (ବେଟାଡାଇନ୍) ଲଗାନ୍ତୁ ।",
        "ତୁରନ୍ତ ନିକଟସ୍ଥ ସରକାରୀ ହସ୍ପିଟାଲକୁ ଯାଇ Anti-Rabies Vaccine (ARV) ଟିକା ନିଅନ୍ତୁ ।"
      ],
      hi: [
        "घाव को तुरंत नल के बहते पानी और साबुन से पूरे 15 मिनट तक लगातार धोएं।",
        "15 मिनट धोने से 80% से अधिक रेबीज वायरस घाव से बाहर निकल जाता है।",
        "उपलब्ध हो तो पोविडोन-आयोडीन (बीटाडीन) लगाएं।",
        "तुरंत नजदीकी अस्पताल जाकर एंटी-रेबीज टीका (ARV) लगवाएं।"
      ]
    },
    donts: {
      en: [
        "DO NOT stitch or suture the wound immediately.",
        "DO NOT apply chili powder, lime, mud, or plant juices."
      ],
      or: [
        "କଦାପି କ୍ଷତରେ ତୁରନ୍ତ ସିଲେଇ ବା ଷ୍ଟିଚ୍ ପକାନ୍ତୁ ନାହିଁ ।",
        "କଦାପି ଲଙ୍କାଗୁଣ୍ଡ, ଚୂନ ବା ମାଟି ଲଗାନ୍ତୁ ନାହିଁ ।"
      ],
      hi: [
        "घाव पर तुरंत टांके कभी न लगवाएं।",
        "घाव पर मिर्च पाउडर, चूना, मिट्टी कभी न लगाएं।"
      ]
    },
    helpline: "104",
    keywords: ["dog", "dog bite", "rabies", "animal bite", "cat bite", "monkey bite", "arv", "କୁକୁର", "କୁକୁର କାମୁଡ଼ା", "ରେବିସ୍", "ପଶୁ କାମୁଡ଼ା", "ବିରାଡ଼ି", "ଟିକା", "कुत्ता", "काटना", "रेबीज", "टीका"]
  },
  {
    id: "choking",
    icon: "🗣️",
    title: {
      en: "Choking & Airway Emergency",
      or: "ଶ୍ୱାସରୁଦ୍ଧ (ତଣ୍ଟିରେ ଖାଦ୍ୟ ଲାଗିଯିବା) ପ୍ରାଥମିକ ଚିକିତ୍ସା",
      hi: "दम घुटना (गले में कुछ अटकना) प्राथमिक उपचार"
    },
    urgency: "CRITICAL",
    summary: {
      en: "Heimlich maneuver for adults; back blows and chest thrusts for infants.",
      or: "ବଡ଼ମଣିଷଙ୍କ ପାଇଁ ହାଇମଲିକ୍ ଚାପ ଏବଂ ଛୋଟ ଶିଶୁଙ୍କ ପାଇଁ ପିଠି ଥାପୁଡ଼ା ପଦ୍ଧତି ।",
      hi: "वयस्कों के लिए हेमलिच पैंतरेबाजी और शिशुओं के लिए पीठ पर थपकी विधि।"
    },
    dos: {
      en: [
        "For Adults: Stand behind them, place fist above navel, give quick upward abdominal thrusts (Heimlich maneuver).",
        "For Infants: Place baby face down on forearm, deliver 5 firm back blows between shoulder blades.",
        "Call 108 immediately if victim cannot breathe or speak."
      ],
      or: [
        "ବୟସ୍କଙ୍କ ପାଇଁ: ପଛପଟେ ଛିଡ଼ା ହୋଇ ନାଭି ଉପରେ ମୁଠା ରଖି ଉପର ଆଡ଼କୁ ଚାପ ଦିଅନ୍ତୁ (Heimlich Maneuver) ।",
        "ଶିଶୁଙ୍କ ପାଇଁ: ହାତ ଉପରେ ଶିଶୁର ମୁହଁ ତଳକୁ ରଖି ପିଠିର ଦୁଇ ଡେଣା ମଝିରେ ୫ ଥର ସାବଧାନରେ ଥାପୁଡ଼ା ଦିଅନ୍ତୁ ।",
        "ରୋଗୀ ଶ୍ୱାସ ନେଇ ନପାରିଲେ ତୁରନ୍ତ ୧୦୮ କୁ କଲ୍ କରନ୍ତୁ ।"
      ],
      hi: [
        "वयस्कों के लिए: पीछे खड़े होकर नाभि के ऊपर मुट्ठी रखकर ऊपर की ओर झटका दें।",
        "शिशु के लिए: मुंह नीचे रखकर पीठ पर 5 बार थपकी दें।",
        "तुरंत 108 पर कॉल करें।"
      ]
    },
    donts: {
      en: [
        "DO NOT perform blind finger sweeps in mouth.",
        "DO NOT slap back while adult is standing upright."
      ],
      or: [
        "ପାଟି ଭିତରେ ଅନ୍ଧାରିଆ ଭାବେ ଆଙ୍ଗୁଠି ପୂରାନ୍ତୁ ନାହିଁ ।"
      ],
      hi: [
        "मुंह में अंधी उंगली डालकर निकालने की कोशिश न करें।"
      ]
    },
    helpline: "108",
    keywords: ["choking", "airway", "swallowed", "food stuck", "cannot breathe", "heimlich", "ଶ୍ୱାସରୁଦ୍ଧ", "ତଣ୍ଟି", "ଅଟକିଯିବା", "ଉಬ್ಬାସ", "ଦମ୍ ବନ୍ଦ", "दम घुटना", "गले में अटकना"]
  },
  {
    id: "febrile",
    icon: "🌡️",
    title: {
      en: "Pediatric High Fever & Febrile Fits",
      or: "ଶିଶୁଙ୍କ ଅତ୍ୟଧିକ ଜ୍ୱର ଓ କମ୍ପଜ୍ୱର (ବାତ ମାରିବା)",
      hi: "बच्चों में तेज़ बुखार व दौरे (कम्पन)"
    },
    urgency: "HIGH",
    summary: {
      en: "Safe recovery positioning and tepid tap-water sponging. Never force spoons into mouth.",
      or: "ପିଲାଙ୍କୁ କଡ଼ ମାଡ଼ି ଶୁଆଇବା ଏବଂ ସାଧାରଣ ପାଣିରେ ସ୍ପଞ୍ଜ କରିବା । କଦାପି ପାଟିରେ ଚାମଚ ଦିଅନ୍ତୁ ନାହିଁ ।",
      hi: "करवट लिटाएं और सामान्य पानी से स्पंज करें। मुंह में चम्मच या उंगली कभी न डालें।"
    },
    dos: {
      en: [
        "Place child gently onto their side (recovery position) to prevent choking on saliva.",
        "Sponge forehead, neck, and limbs continuously with normal room-temperature tap water.",
        "Loosen clothes and maintain gentle air circulation.",
        "Take child to nearest CHC/PHC for clinical evaluation after the fit stops."
      ],
      or: [
        "ପିଲାକୁ ନରମ ବିଛଣାରେ କଡ଼ ମାଡ଼ି ଶୁଆନ୍ତୁ ଯାହାଦ୍ୱାରା ଲାଳ ବା ବାନ୍ତିରେ ଶ୍ୱାସରୁଦ୍ଧ ହେବ ନାହିଁ ।",
        "କପାଳ, ବେକ ଓ ହାତଗୋଡ଼କୁ ସାଧାରଣ ଟାପ୍ ପାଣି ପଟିରେ ଲଗାତାର ସ୍ପଞ୍ଜ କରନ୍ତୁ ।",
        "ବାତ ବନ୍ଦ ହେବା ପରେ ତୁରନ୍ତ ନିକଟସ୍ଥ CHC/PHC ଡାକ୍ତରଙ୍କ ପାଖକୁ ନିଅନ୍ତୁ ।"
      ],
      hi: [
        "बच्चे को करवट लिटाएं ताकि लार से सांस न रुके।",
        "माथे, गर्दन और हाथ-पैरों पर सामान्य पानी की पट्टी रखकर स्पंज करें।",
        "दौरा शांत होने पर तुरंत अस्पताल ले जाएं।"
      ]
    },
    donts: {
      en: [
        "NEVER force a spoon, finger, or cloth into child's mouth during a seizure.",
        "NEVER give oral medicine or water while child is actively convulsing."
      ],
      or: [
        "ବାତ ମାରୁଥିବା ସମୟରେ କଦାପି ପାଟିରେ ଚାମଚ, ଆଙ୍ଗୁଠି ବା କପଡ଼ା ଜୋରକରି ପୂରାନ୍ତୁ ନାହିଁ ।",
        "ଅଚେତ ଥିବା ବେଳେ ପାଟିରେ ଔଷଧ ବା ପାଣି ଦିଅନ୍ତୁ ନାହିଁ ।"
      ],
      hi: [
        "दौरे के समय मुंह में चम्मच या उंगली बिल्कुल न डालें।",
        "बेहोशी में मुंह में दवा या पानी न डालें।"
      ]
    },
    helpline: "104",
    keywords: ["fever", "high fever", "convulsions", "seizures", "fits", "child fever", "febrile", "ଜ୍ୱର", "ବାତ", "କମ୍ପ", "ପିଲା ଜ୍ୱର", "ଫିଟ୍ସ", "ତେଜ ଜ୍ୱର", "बुखार", "दौरा", "कम्पन", "बच्चा"]
  },
  {
    id: "drowning",
    icon: "🏊",
    title: {
      en: "Drowning & CPR First Aid Protocol",
      or: "ପାଣିରେ ବୁଡ଼ିଯିବା ଓ CPR ପ୍ରାଥମିକ ଚିକିତ୍ସା",
      hi: "डूबने पर प्राथमिक उपचार व सीपीआर"
    },
    urgency: "CRITICAL",
    summary: {
      en: "Safe extrication, clearing airway, and immediate CPR (30 compressions : 2 rescue breaths).",
      or: "ପାଣିରୁ ସୁରକ୍ଷିତ ଉଦ୍ଧାର, ଶ୍ୱାସନଳୀ ସଫା କରିବା ଏବଂ ତୁରନ୍ତ CPR (୩୦ ଛାତି ଚାପ : ୨ ଶ୍ୱାସ) ।",
      hi: "सुरक्षित बाहर निकालें, सांस की नली साफ करें और तुरंत सीपीआर (30 दबाव : 2 सांस) दें।"
    },
    dos: {
      en: [
        "Remove victim from water safely. Call 108 immediately.",
        "Check breathing. If not breathing normally, place on firm ground.",
        "Start CPR: Place heel of hand on center of chest. Push hard and fast (100-120 compressions/min).",
        "Give 30 chest compressions followed by 2 gentle rescue breaths."
      ],
      or: [
        "ରୋଗୀଙ୍କୁ ପାଣିରୁ ସୁରକ୍ଷିତ ଉଦ୍ଧାର କରନ୍ତୁ । ତୁରନ୍ତ ୧୦୮ କୁ କଲ୍ କରନ୍ତୁ ।",
        "ଶ୍ୱାସ ନଚାଲିଲେ ଟାଣ ଚଟାଣରେ ଶୁଆଇ ତୁରନ୍ତ CPR ଆରମ୍ଭ କରନ୍ତୁ (ମିନିଟକୁ ୧୦୦-୧୨୦ ଥର ଛାତି ଚାପ) ।",
        "୩୦ ଥର ଛାତି ଚାପ ପରେ ମୁଣ୍ଡ ଟେକି ନାକ ଚିପି ପାଟିରେ ୨ ଥର ଫୁଙ୍କ ଦିଅନ୍ତୁ ।"
      ],
      hi: [
        "मरीज को पानी से सुरक्षित बाहर निकालें। तुरंत 108 पर एम्बुलेंस बुलाएं।",
        "सांस न चलने पर तुरंत सीपीआर (30 दबाव : 2 सांस) शुरू करें।"
      ]
    },
    donts: {
      en: [
        "DO NOT waste time trying to pump water out of the stomach.",
        "DO NOT delay CPR if breathing is absent."
      ],
      or: [
        "ପେଟରୁ ପାଣି ବାହାର କରିବା ପାଇଁ ଓଲଟା କରି ସମୟ ନଷ୍ଟ କରନ୍ତୁ ନାହିଁ ।",
        "ଶ୍ୱାସ ଚାଲୁନଥିଲେ CPR ଆରମ୍ଭ କରିବାରେ ଆଦୌ ବିଳମ୍ବ କରନ୍ତୁ ନାହିଁ ।"
      ],
      hi: [
        "पेट से पानी निकालने के चक्कर में उल्टा लटकाकर समय बर्बाद न करें।"
      ]
    },
    helpline: "108",
    keywords: ["drowning", "water", "pond", "river", "cpr", "submersion", "ପାଣିରେ ବୁଡ଼ିଯିବା", "ନଈ", "ପୋଖରୀ", "ପାଣି", "ଶ୍ୱାସ ବନ୍ଦ", "डूबना", "पानी", "सीपीआर"]
  }
];

const appJsPath = path.join(__dirname, '..', 'public', 'app.js');
let appJs = fs.readFileSync(appJsPath, 'utf8');

const startMarker = 'const OFFLINE_PROTOCOLS = [';
const endMarker = 'let offlineSearchQuery =';

const startIndex = appJs.indexOf(startMarker);
const endIndex = appJs.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = 'const OFFLINE_PROTOCOLS = ' + JSON.stringify(OFFLINE_PROTOCOLS, null, 2) + ';\n\n  ';
  appJs = appJs.slice(0, startIndex) + replacement + appJs.slice(endIndex);
  fs.writeFileSync(appJsPath, appJs, 'utf8');
  console.log('Successfully replaced OFFLINE_PROTOCOLS with valid JSON structure!');
} else {
  console.error('Markers not found.');
}
