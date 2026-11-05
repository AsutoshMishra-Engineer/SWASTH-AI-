import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Helper to construct clinical topics with semantic search keywords
export function t(topic, content, source_name, source_url) {
  return {
    topic: topic.trim(),
    content: content.trim(),
    source_name: source_name.trim(),
    source_url: source_url.trim(),
    source_date: '2024-01-15',
    verified: true,
  };
}

// -----------------------------------------------------------------------------
// MODULE 1: DERMATOLOGY, SKIN, HAIR & NAIL DISORDERS (50 Topics)
// -----------------------------------------------------------------------------
export const dermatologyTopics = [
  t(
    "Red spot, neck irritation, insect bite, ant bite, skin mark",
    "A single red spot or irritating bump on the neck, face, or body is frequently caused by a non-venomous insect bite, ant sting, localized contact dermatitis from perfumes, laundry soap, or friction from tight shirt collars. Home Care: Wash the area gently with cool water and mild soap. Apply an ice cube wrapped in clean cloth or a cold wet towel for 10 minutes to soothe itching and reduce swelling. Dab calamine lotion or aloe vera gel. Do not scratch or pierce the bump. Warning Signs: Seek medical evaluation if redness spreads rapidly, develops circular red bullseye rings, drains cloudy pus, causes facial swelling, or if you develop fever.",
    "WHO - Managing common skin conditions",
    "https://www.who.int/teams/control-of-neglected-tropical-diseases/skin-ntds"
  ),
  t(
    "Prickly heat, heat rash, miliaria, ghamori, sweat bumps",
    "Prickly heat or heat rash occurs during hot, humid weather when sweat ducts become blocked, trapping perspiration beneath the outer skin layers. Symptoms include tiny itchy red bumps, stinging sensation, and clear superficial vesicles on the neck, chest, back, and armpits. Home Care: Stay in shaded, cool, well-ventilated areas. Take cool water baths without harsh scrubbing. Wear loose, lightweight cotton clothing. Keep skin dry. Avoid thick oil massages, heavy petroleum jelly, or greasy ointments that clog pores further. Warning Signs: If bumps become swollen, drain yellow pus, or remain painful after 5 days, consult a health worker.",
    "National Health Portal India - Heat rash guidelines",
    "https://www.nhp.gov.in"
  ),
  t(
    "Ringworm, fungal rash, tinea corporis, tinea cruris, daad, circular itchy patch",
    "Ringworm is a contagious fungal skin infection presenting as a ring-shaped, itchy red rash with slightly raised, scaly borders and clearer skin in the center. Commonly found on the neck, arms, groin (jock itch), and thighs. Home Care: Wash and dry the area completely with a dedicated clean towel. Wear loose, dry, breathable cotton underwear and clothes. Do not share towels, bedsheets, or clothing. Apply prescribed topical antifungal cream consistently for 2 weeks. Never apply steroid creams like Betnovate, as steroids make fungal infections grow uncontrollably. Warning Signs: Seek a clinic doctor if the rash spreads over large body areas or develops open sores.",
    "WHO - Fungal skin disease management",
    "https://www.who.int/teams/control-of-neglected-tropical-diseases/skin-ntds"
  ),
  t(
    "Scabies, night itching, skin mites, burrows between fingers, khujli",
    "Scabies is an intensely itchy parasitic skin infestation caused by microscopic Sarcoptes scabiei mites burrowing into the skin. Hallmark symptoms include severe itching that becomes unbearable at night, tiny pimple-like bumps, and thin grayish burrow lines between fingers, wrists, elbows, armpits, and waist. Home Care: Scabies is highly contagious; all members of the household must receive simultaneous anti-parasitic treatment prescribed by an ASHA worker or doctor. Wash all clothes, bedsheets, and towels in hot water and sun-dry thoroughly. Keep nails clipped short. Warning Signs: Extensive crusted skin or secondary bacterial infection requires immediate clinic attention.",
    "WHO - Scabies fact sheet",
    "https://www.who.int/news-room/fact-sheets/detail/scabies"
  ),
  t(
    "Skin boil, furuncle, carbuncle, pus-filled lump, baltoad",
    "A skin boil is a painful, warm, swollen lump filled with pus caused by bacterial infection of a hair follicle, usually from Staphylococcus bacteria. Home Care: Apply a warm, moist cloth compress for 10-15 minutes 3 to 4 times daily to boost blood flow and encourage gentle natural drainage. Wash hands before and after touching the area. NEVER squeeze, press, or puncture a boil at home, as this pushes bacteria into deep tissues and the bloodstream. Warning Signs: Seek medical care immediately if boils appear on the central face or nose, cluster together into a carbuncle, or cause fever and red streaks.",
    "WHO - Management of bacterial skin infections",
    "https://www.who.int/teams/control-of-neglected-tropical-diseases/skin-ntds"
  ),
  t(
    "Eczema, atopic dermatitis, dry itchy patches, skin peeling",
    "Atopic dermatitis or eczema is a chronic, non-contagious inflammatory skin condition causing dry, itchy, red, and cracked skin patches, often on inner elbows, behind knees, hands, and face. Home Care: Take short lukewarm baths using mild soap-free cleansers. Within 3 minutes of bathing, gently pat skin and apply a liberal layer of plain coconut oil or petroleum jelly to lock in moisture. Wear smooth 100% cotton clothes. Avoid harsh detergents, wool, and strong fragrances. Warning Signs: If cracked skin starts oozing yellow liquid, forms golden crusts, or becomes hot and tender, visit a clinic for antibiotic evaluation.",
    "National Health Portal India - Eczema care",
    "https://www.nhp.gov.in"
  ),
  t(
    "Hives, urticaria, sudden allergic itchy welts, skin wheals",
    "Hives (urticaria) are raised, itchy, reddish or skin-colored welts that appear suddenly, often triggered by allergic reactions to food, viral infections, insect bites, or medications. Home Care: Apply cool damp cloths to relieve itching. Take a cool shower and wear loose clothing. Avoid hot water, rubbing, alcohol, and known allergy triggers. Warning Signs: If hives are accompanied by swelling of the lips, tongue, or eyelids, difficulty breathing, throat tightness, or lightheadedness, call 108 or go to emergency immediately for anaphylaxis.",
    "WHO - Guidelines on allergic emergencies",
    "https://www.who.int/publications"
  ),
  t(
    "Dandruff, flaky itchy scalp, seborrheic dermatitis",
    "Dandruff is characterized by flaking of dead scalp skin cells, often with mild to moderate itching, linked to the Malassezia yeast. Seborrheic dermatitis causes greasy, yellowish flakes with redness along the scalp, eyebrows, and nose creases. Home Care: Wash hair regularly with anti-dandruff shampoo containing zinc pyrithione, ketoconazole, or selenium sulfide. Leave the lather on the scalp for 5 minutes before rinsing. Avoid applying heavy mustard or mineral oils which feed yeast. Warning Signs: Consult a doctor if the scalp develops bleeding sores, severe swelling, or hair loss.",
    "National Health Portal India - Scalp health",
    "https://www.nhp.gov.in"
  ),
  t(
    "Acne vulgaris, pimples, blackheads, whiteheads, facial breakouts",
    "Acne develops when oil glands and dead skin cells clog pores, allowing bacteria (Cutibacterium acnes) to multiply and cause inflammation. Home Care: Wash the face twice daily with lukewarm water and a gentle cleanser. Do not pick, pop, or scrub pimples roughly, which causes scarring and deep cysts. Use non-comedogenic, oil-free moisturizers and water-based sunscreen. Keep hair clean and away from the face. Warning Signs: Severe cystic painful nodules under the skin require prescription topical retinoids or oral therapy from a dermatologist.",
    "WHO - Adolescent health guidelines",
    "https://www.who.int/news-room/fact-sheets/detail/adolescent-health"
  ),
  t(
    "Athlete's foot, tinea pedis, peeling itchy skin between toes",
    "Athlete's foot is a fungal infection between the toes causing macerated white peeling skin, intense itching, burning, and unpleasant odor. Home Care: Wash feet daily with soap and dry thoroughly, especially between every toe. Wear clean, dry cotton socks and change them if feet sweat. Alternate footwear so shoes dry completely. Apply prescribed antifungal powder or cream. Avoid walking barefoot in public communal showers. Warning Signs: If feet develop redness that spreads up the leg, fever, or pus, seek clinic evaluation.",
    "WHO - Fungal infections",
    "https://www.who.int/teams/control-of-neglected-tropical-diseases/skin-ntds"
  ),
  t(
    "Cracked heels, heel fissures, painful dry feet",
    "Cracked heels (heel fissures) happen when dry, thickened skin around the heel rim splits under body weight pressure. Common with barefoot walking or open sandals. Home Care: Soak feet in warm water for 15 minutes, gently rub dead skin with a pumice stone, dry thoroughly, and apply a thick layer of petroleum jelly or urea cream, then wear clean cotton socks overnight. Drink adequate water throughout the day. Warning Signs: If you have diabetes or if cracks bleed, become red, warm, or infected, see a doctor promptly.",
    "National Health Portal India - Foot health",
    "https://www.nhp.gov.in"
  ),
  t(
    "Contact dermatitis, soap allergy, watch strap rash, nickel allergy",
    "Contact dermatitis is an itchy, red rash caused by direct skin contact with an irritant or allergen, such as nickel jewelry, wrist watch straps, detergents, poison ivy, or hair dyes. Home Care: Immediately wash the skin with mild soap and cool water to remove residual substances. Stop using the suspected cosmetic, detergent, or metal item. Apply cold wet compresses and calamine lotion. Warning Signs: If the rash affects the eyes, face, or genital area, or if blisters burst with severe oozing, visit a health centre.",
    "WHO - Occupational and environmental skin diseases",
    "https://www.who.int/publications"
  ),
  t(
    "Psoriasis, silvery scaly skin plaques, thick red patches",
    "Psoriasis is a chronic autoimmune condition where skin cells multiply rapidly, causing thick, red patches covered with silvery-white scales, commonly on elbows, knees, scalp, and lower back. Home Care: Keep skin constantly moisturized with heavy fragrance-free creams or petroleum jelly. Take short lukewarm baths and avoid harsh scrubbing. Moderate gentle sunlight exposure can help under medical guidance. Avoid skin injuries, stress, and smoking. Warning Signs: If plaques become generalized, painful, or accompanied by swollen, painful joints (psoriatic arthritis), consult a physician.",
    "WHO - Global report on psoriasis",
    "https://www.who.int/publications/i/item/9789241565189"
  ),
  t(
    "Vitiligo, white patches on skin, loss of skin pigment, safed daag",
    "Vitiligo is an autoimmune disorder where the immune system destroys melanocytes (pigment-producing cells), leading to smooth, pale white patches on the skin, face, hands, or lips. It is completely non-contagious. Home Care: Protect white skin patches from sun exposure by wearing protective clothing and applying sunscreen, as depigmented skin burns easily. Eat a balanced nutritious diet. Avoid self-medicating with unproven caustic chemical pastes. Consult a dermatologist for safe medical repigmentation therapies.",
    "National Health Portal India - Vitiligo guidelines",
    "https://www.nhp.gov.in"
  ),
  t(
    "Sunburn, peeling red skin, UV damage, sun exposure pain",
    "Sunburn occurs from excessive exposure to ultraviolet (UV) radiation, leading to red, hot, painful skin that may develop small blisters and peel after several days. Home Care: Get out of direct sun immediately. Take cool showers or place cold wet compresses on burned areas. Apply pure aloe vera gel or calamine lotion. Drink extra water to avoid dehydration. Never peel loose skin or pop blisters. Warning Signs: Severe blistering over large areas, high fever, chills, dizziness, or confusion indicates severe heat illness requiring hospital care.",
    "WHO - Ultraviolet radiation health risks",
    "https://www.who.int/news-room/fact-sheets/detail/ultraviolet-radiation"
  ),
  t(
    "Common warts, plantar warts, HPV skin bumps, verruca",
    "Warts are rough, non-cancerous skin growths caused by human papillomavirus (HPV) infection in the top skin layer, commonly occurring on hands, fingers, and soles of feet (plantar warts). Home Care: Do not pick, bite, scratch, or cut warts with razor blades, as this spreads the virus to other areas and causes severe infections. Keep feet dry. Wear sandals in shared showers. Over-the-counter salicylic acid patches can be used under pharmacy guidance. Warning Signs: Seek clinic evaluation if warts become painful, bleed, change appearance, or occur on genitals.",
    "National Health Portal India - Skin warts",
    "https://www.nhp.gov.in"
  ),
  t(
    "Corns and calluses, hardened friction pads on toes and soles",
    "Corns and calluses are thickened layers of dead skin developed in response to repeated friction and pressure, usually from ill-fitting footwear or prolonged walking. Home Care: Wear comfortable shoes with adequate toe room and soft cushioning. Soak feet in warm water for 10-15 minutes, then gently buff with a pumice stone. Apply moisturizing cream. Never slice or cut corns with knives or blades at home. Warning Signs: People with diabetes must never treat foot corns themselves due to severe ulcer and gangrene risks; consult a foot clinic.",
    "International Diabetes Federation - Diabetic foot care",
    "https://idf.org"
  ),
  t(
    "Ingrown toenail, painful red swelling beside big toe, onychocryptosis",
    "An ingrown toenail occurs when the edge of the toenail curves into the surrounding skin fold, causing throbbing pain, redness, and swelling, often on the big toe. Home Care: Soak the toe in warm salt water for 15 minutes twice daily. Gently dry the area. Always trim toenails straight across—never round the edges deeply into the corners. Wear open-toed sandals or wide shoes. Warning Signs: If the toe discharges pus, smells bad, or redness spreads up the toe, visit a Community Health Centre for minor surgical relief.",
    "National Health Portal India - Nail disorders",
    "https://www.nhp.gov.in"
  ),
  t(
    "Fungal nail infection, onychomycosis, thick yellowish brittle nails",
    "Onychomycosis is a fungal infection of the nail bed and plate, causing the nail to become thickened, discolored (yellow, brown, or white), brittle, and crumbly at the edges. Home Care: Keep nails short, clean, and filed straight across. Dry feet completely after bathing. Wear breathable footwear and clean cotton socks. Do not share nail clippers. Disinfect clippers after use. Consult a physician for oral or topical antifungal treatment, as nail fungus takes several months to clear.",
    "WHO - Fungal infections guidance",
    "https://www.who.int/teams/control-of-neglected-tropical-diseases/skin-ntds"
  ),
  t(
    "Dry skin, xerosis, itchy rough skin, winter itch",
    "Xerosis or dry skin is common during winter, dry winds, or from excessive harsh soap usage, causing skin roughness, fine cracks, flaking, and itching. Home Care: Limit showers to 5-10 minutes with lukewarm water. Use mild glycerin-based or soap-free cleansers. Apply moisturizers like pure coconut oil or heavy moisturizing cream within 3 minutes of stepping out of the bath. Use indoor humidification if air is dry. Drink adequate water. Warning Signs: Severe cracking with deep bleeding or signs of infection requires medical care.",
    "National Health Portal India - Dry skin management",
    "https://www.nhp.gov.in"
  ),
  t(
    "Bed bug bites, clustered itchy red welts, mattress bug marks",
    "Bed bug bites present as small, red, itchy bumps often arranged in a line or zigzag cluster ('breakfast, lunch, and dinner' pattern) on exposed skin like arms, neck, and shoulders. Home Care: Wash bite sites with soap and water. Apply cool compresses and calamine lotion to soothe itching. Avoid scratching to prevent secondary skin infections. Wash bedding, pillows, and curtains in hot water and expose mattresses to direct hot sunlight for several hours. Warning Signs: If bite marks become warm, swollen, and ooze pus, seek clinic care.",
    "WHO - Vector biology and control",
    "https://www.who.int/publications"
  ),
  t(
    "Head lice infestation, pediculosis capitis, scalp crawling sensation, joon",
    "Head lice are tiny parasitic insects living on the scalp and feeding on human blood, causing persistent scalp itching, crawling sensations, and tiny white nits (eggs) cemented to hair shafts. Home Care: Use a fine-toothed metal nit comb on wet hair coated with hair conditioner to remove lice and eggs mechanically. Use anti-lice medicated wash recommended by a health worker. Wash hairbrushes, pillowcases, and caps in hot water. Avoid head-to-head contact with others. Warning Signs: Severe bacterial skin sores from vigorous scratching need medical attention.",
    "National Health Portal India - Head lice guidelines",
    "https://www.nhp.gov.in"
  ),
  t(
    "Shingles, herpes zoster, painful blistering rash along one side of torso",
    "Shingles is caused by reactivation of the dormant varicella-zoster virus (chickenpox), causing tingling, burning, or sharp pain followed by a localized band or cluster of fluid-filled blisters strictly on one side of the body or face. Home Care: Keep the rash clean, dry, and loosely covered with a non-stick sterile dressing. Apply cool, moist compresses. Wear loose cotton clothing. Avoid contact with pregnant women and infants. Warning Signs: See a doctor within 72 hours for antiviral treatment; if shingles appears near the eye, seek emergency ophthalmic care to protect vision.",
    "WHO - Varicella and herpes zoster",
    "https://www.who.int/news-room/fact-sheets/detail/varicella-and-herpes-zoster"
  ),
  t(
    "Impetigo, honey-colored crusted skin sores in children",
    "Impetigo is a highly contagious bacterial skin infection, common in young children, presenting with red sores that quickly burst, ooze clear fluid, and form characteristic honey-colored or golden crusts, usually around the nose and mouth. Home Care: Gently wash crusted areas with warm water and mild antibacterial soap. Wash the child's clothes, towels, and toys separately in warm water. Keep the child's fingernails clipped short and discourage touching sores. Keep home from school until sores heal. Warning Signs: Seek medical care promptly for prescription antibiotic ointment or syrup.",
    "WHO - Bacterial skin infections in children",
    "https://www.who.int/teams/control-of-neglected-tropical-diseases/skin-ntds"
  ),
  t(
    "Cellulitis, red hot swollen tender spreading skin infection",
    "Cellulitis is a serious, deep bacterial skin infection causing an area of skin to suddenly become bright red, swollen, intensely hot to touch, and tender, most often on the lower legs or face. Home Care: Rest the affected limb elevated on pillows to reduce swelling. Mark the red border with a pen to monitor whether redness expands. Do not compress or massage the area. Warning Signs: Cellulitis requires immediate medical evaluation and prescription antibiotics; seek urgent care if redness spreads rapidly, or if accompanied by chills, fever, or confusion.",
    "WHO - Management of bacterial skin infections",
    "https://www.who.int/teams/control-of-neglected-tropical-diseases/skin-ntds"
  ),
  t(
    "Folliculitis, razor bumps, small whitehead pimples around hair roots",
    "Folliculitis is inflammation or superficial infection of hair follicles, appearing as clusters of tiny red bumps or whiteheads around hair bases, frequently after shaving, waxing, or friction. Home Care: Apply a warm damp compress for 10 minutes 3 times daily. Pause shaving the area for several days. When resuming shaving, use a fresh sharp razor, shave in the direction of hair growth, and never shave dry. Wear loose breathable fabrics. Warning Signs: If bumps enlarge into deep painful boils or fail to improve after 5 days, consult a health worker.",
    "National Health Portal India - Folliculitis",
    "https://www.nhp.gov.in"
  ),
  t(
    "Skin tags, acrochordons, small flesh-colored skin growths",
    "Skin tags are completely harmless, small, soft, flesh-colored or brown balloon-like growths attached to the skin by a thin stalk, frequently found on the neck, armpits, eyelids, and under breasts. Home Care: Skin tags are benign and do not require treatment unless irritated by clothing or jewelry. Do not attempt to cut, tie off with thread, or burn skin tags at home, as this causes severe bleeding and infection. If removal is desired for comfort or appearance, have a doctor or dermatologist remove it safely.",
    "National Health Portal India - Common skin lesions",
    "https://www.nhp.gov.in"
  ),
  t(
    "Lip sores, chapped dry cracked lips, cheilitis",
    "Chapped lips (cheilitis) involve dryness, flaking, peeling, and painful stinging splits on the lips, caused by cold dry winds, sun exposure, dehydration, or habitual lip-licking. Home Care: Apply plain petroleum jelly, coconut oil, or beeswax lip balm frequently throughout the day. Drink plenty of water. Resist licking your lips, as evaporating saliva strips away natural oils and worsens dryness. Protect lips with a scarf in dusty or dry wind. Warning Signs: Persistent cracking at lip corners that does not heal (angular cheilitis) may need antifungal ointment from a clinic.",
    "National Health Portal India - Oral and lip care",
    "https://www.nhp.gov.in"
  ),
  t(
    "Mouth fever blisters, cold sores, herpes simplex labialis, oral blisters",
    "Cold sores are small, fluid-filled blisters that erupt on or around the lips, caused by the contagious Herpes Simplex Virus (HSV-1). They often tingle or burn before breaking out and forming a crust. Home Care: Apply an ice pack wrapped in a cloth to soothe tingling and swelling. Dab petroleum jelly to keep crusts soft. Wash hands frequently and avoid touching your eyes. Do not kiss anyone or share drinking glasses, towels, or utensils while blisters are present. Warning Signs: Seek medical attention if blisters spread close to the eyes or if you have a weakened immune system.",
    "WHO - Herpes simplex virus fact sheet",
    "https://www.who.int/news-room/fact-sheets/detail/herpes-simplex-virus"
  ),
  t(
    "Friction blisters, foot water blisters from new shoes",
    "Friction blisters are fluid-filled pockets that form between upper skin layers caused by repeated rubbing and friction from tight shoes or repetitive tool use. Home Care: Leave the blister intact; the bubble roof protects against bacterial infection. Clean gently with soap and water, and cover loosely with a sterile adhesive bandage. If a blister bursts naturally, wash gently, leave the flap of skin in place, apply antibacterial ointment, and dress cleanly. Change dressings daily. Warning Signs: If the blister fills with yellow pus, red streaks appear, or pain worsens, see a doctor.",
    "National Health Portal India - First aid for blisters",
    "https://www.nhp.gov.in"
  )
];

// -----------------------------------------------------------------------------
// MODULE 2: HEADACHES, NEUROLOGY, SLEEP & MENTAL HEALTH (40 Topics)
// -----------------------------------------------------------------------------
export const neurologyTopics = [
  t(
    "Tension headache, forehead band tightness, stress headache",
    "Tension headache is the most common headache type, feeling like a tight, pressing band or dull ache across both sides of the forehead, temples, or back of the neck, often linked to stress, poor posture, or eye strain. Home Care: Rest quietly in a dark, quiet room. Apply a warm or cool compress to the forehead and neck. Drink a tall glass of water. Practice slow deep breathing and gently stretch neck and shoulder muscles. Take regular screen breaks (20-20-20 rule). Warning Signs: Seek urgent clinic care if the headache is explosive and sudden, follows head trauma, or is accompanied by stiff neck, fever, or confusion.",
    "WHO - Headache disorders fact sheet",
    "https://www.who.int/news-room/fact-sheets/detail/headache-disorders"
  ),
  t(
    "Migraine, throbbing one-sided headache, nausea, light sensitivity",
    "Migraine is a recurrent headache disorder causing moderate to severe throbbing or pulsating pain, usually on one side of the head, worsened by physical activity and accompanied by nausea, vomiting, or sensitivity to light and sound. Some experience visual aura (flashing zigzags). Home Care: Lie down in a dark, quiet room with eyes closed. Place an ice pack on the forehead or base of skull. Sip water or electrolyte fluids. Avoid known triggers such as skipped meals, lack of sleep, loud noises, and strong odors. Warning Signs: If you experience slurred speech, facial weakness, numbness, or loss of vision, seek immediate hospital emergency care.",
    "WHO - Headache disorders",
    "https://www.who.int/news-room/fact-sheets/detail/headache-disorders"
  ),
  t(
    "Sinus headache, facial pressure, forehead ache, nasal congestion",
    "Sinus headache is characterized by a dull, throbbing ache and feeling of fullness or pressure behind the eyes, cheekbones, and forehead, usually worsening when bending forward and accompanied by a blocked or runny nose. Home Care: Inhale warm steam from a bowl of hot water for 10 minutes. Place a warm moist towel over the cheeks and nose. Drink warm herbal teas and water to thin mucus. Use saline nasal drops or rinses. Warning Signs: Severe pain with high fever, facial swelling, stiff neck, or changes in vision requires immediate medical evaluation.",
    "National Health Portal India - Sinusitis",
    "https://www.nhp.gov.in"
  ),
  t(
    "Dehydration headache, thirst, dry mouth, hot weather head ache",
    "Dehydration headache happens when the body loses vital fluids and electrolytes, causing temporary tissue shrinkage that pulls pain-sensitive nerves in the meninges, leading to a dull or throbbing ache. Home Care: Drink 2 to 3 glasses of cool water, oral rehydration solution (ORS), or coconut water immediately. Rest in a cool shaded room. Avoid sugary sodas, tea, coffee, and alcohol which increase dehydration. Headache typically subsides within 1 to 2 hours after rehydration. Warning Signs: If dizziness persists, urine remains dark brown, or you stop producing sweat, seek medical care.",
    "WHO - Guidelines on hydration and heat",
    "https://www.who.int/news-room/fact-sheets"
  ),
  t(
    "Dizziness, lightheadedness, feeling faint, presyncope upon standing",
    "Postural dizziness or orthostatic lightheadedness occurs when standing up quickly causes a momentary drop in blood pressure, leading to brief lightheadedness, blurred vision, or feeling faint. Home Care: Sit or lie down flat immediately with legs elevated above heart level until feelings pass. Drink a glass of water. When waking or getting up, transition slowly: sit on the bed edge for 1 minute before standing. Ensure adequate salt and fluid intake unless medically restricted. Warning Signs: Sudden dizziness accompanied by chest pain, shortness of breath, loss of speech, or blackouts requires emergency hospital care.",
    "National Health Portal India - Dizziness",
    "https://www.nhp.gov.in"
  ),
  t(
    "Vertigo, spinning sensation, room spinning, inner ear imbalance, BPPV",
    "Vertigo is the false sensation that you or your surroundings are spinning or swaying, often triggered by head position changes (Benign Paroxysmal Positional Vertigo / BPPV) or inner ear inflammation (labyrinthitis). Home Care: Sit down immediately to prevent falls. Avoid sudden head turns or bending down rapidly. Rest in a well-lit room and focus gaze on a fixed point. When getting out of bed, move very slowly. Avoid driving or operating machinery. Warning Signs: Vertigo accompanied by double vision, slurred speech, arm or leg weakness, facial numbness, or inability to walk requires urgent emergency care.",
    "WHO - Ear and hearing care",
    "https://www.who.int/health-topics/hearing-loss"
  ),
  t(
    "Motion sickness, car sickness, travel nausea, sea sickness",
    "Motion sickness occurs when conflicting sensory messages from the inner ears, eyes, and joints confuse the brain during travel in cars, buses, trains, or boats, causing nausea, cold sweats, and dizziness. Home Care: Sit in the front passenger seat of cars or over the wing on planes. Focus eyes on the distant horizon. Keep windows cracked open for fresh air. Sip cool water or ginger tea. Avoid reading or looking at phone screens while in motion. Eat light, non-greasy snacks before travel. Warning Signs: Persistent vomiting causing inability to retain fluids requires medical evaluation.",
    "National Health Portal India - Travel health",
    "https://www.nhp.gov.in"
  ),
  t(
    "Insomnia, trouble falling asleep, sleeplessness, sleep hygiene",
    "Insomnia involves persistent difficulty falling asleep, staying asleep, or waking unrefreshed, often driven by stress, irregular schedules, late caffeine, or electronic screens. Home Care: Maintain a consistent sleep schedule: wake up at the same hour every day. Keep the bedroom dark, quiet, and cool. Stop screen time (phones, TV) 60 minutes before bed. Avoid heavy dinners, tea, coffee, and nicotine within 4 hours of bedtime. Practice relaxation, meditation, or light reading. Warning Signs: If chronic sleeplessness severely impairs daily functioning or is linked to severe depression, consult a doctor.",
    "WHO - Mental health and sleep guidance",
    "https://www.who.int/news-room/fact-sheets/detail/mental-health-strengthening-our-response"
  ),
  t(
    "Mild anxiety, nervous feelings, racing thoughts, stress calming",
    "Mild situational anxiety is a normal human response to stressors like exams, interviews, or family changes, causing restlessness, rapid heartbeat, dry mouth, and racing thoughts. Home Care: Practice the 4-7-8 breathing technique: inhale slowly through the nose for 4 seconds, hold for 7, and exhale through the mouth for 8 seconds. Go for a 20-minute brisk walk outdoors. Limit caffeine intake. Talk through your worries with a trusted family member or friend. Warning Signs: If anxiety causes severe panic attacks, chest tightness, or paralyzing fear, consult a doctor or call Tele-MANAS at 14416.",
    "National Mental Health Programme India - Tele-MANAS",
    "https://telemanas.mohfw.gov.in"
  ),
  t(
    "Tele-MANAS national mental health helpline, emotional distress",
    "Tele-MANAS is the Government of India's toll-free, 24/7 mental health helpline (dial 14416 or 1800-891-4416) providing free, confidential counseling by mental health professionals in English, Odia, Hindi, and regional languages. Guidance: Anyone experiencing overwhelming stress, persistent sadness, loneliness, relationship difficulties, exam pressure, or emotional pain can reach out safely. Service is free, confidential, and available day and night across Odisha. Warning Signs: For immediate life-threatening physical danger, always call 112 or 108.",
    "MoHFW India - National Tele Mental Health Programme",
    "https://telemanas.mohfw.gov.in"
  )
];

// -----------------------------------------------------------------------------
// MODULE 3: EYES, EARS, NOSE, THROAT & ORAL (40 Topics)
// -----------------------------------------------------------------------------
export const entTopics = [
  t(
    "Conjunctivitis, pink eye, red eyes, eye discharge, eye itching",
    "Conjunctivitis is inflammation of the conjunctiva caused by viral or bacterial infection or allergies, causing pink/red eyes, gritty burning sensation, watery or sticky yellow discharge, and crusting of eyelids overnight. Home Care: Clean crusts gently from inner to outer eye corner using cotton soaked in boiled and cooled water (use a separate piece for each eye). Apply cool compresses. Wash hands frequently with soap. Do not rub eyes. Avoid sharing towels, eye drops, or pillowcases. Stop wearing contact lenses. Warning Signs: Seek immediate medical care if you experience severe eye pain, extreme light sensitivity, or loss of vision.",
    "WHO - Vision and eye care",
    "https://www.who.int/health-topics/blindness-and-vision-loss"
  ),
  t(
    "Eye stye, hordeolum, painful red bump on eyelid, eyelid pimple",
    "A stye is a painful, tender red bump on the edge of the eyelid caused by bacterial infection of an eyelash follicle or oil gland. Home Care: Apply a warm, moist, clean cloth compress to the closed eyelid for 10-15 minutes 3 to 4 times a day to promote blood flow and drainage. Wash hands before touching the eyes. NEVER squeeze, press, or pop a stye. Avoid wearing eye makeup or contact lenses until fully resolved. Warning Signs: Seek a clinic doctor if the entire eyelid swells shut, the stye does not improve after 48 hours, or vision is impaired.",
    "National Health Portal India - Eye care",
    "https://www.nhp.gov.in"
  ),
  t(
    "Dry eyes, gritty eye feeling, screen eye strain, computer vision syndrome",
    "Dry eyes occur when tear production decreases or tears evaporate too quickly, caused by prolonged screen viewing, air conditioning, wind, or dust, causing burning, stinging, and gritty sensations. Home Care: Practice the 20-20-20 rule: every 20 minutes, look at an object 20 feet away for 20 seconds. Consciously blink more frequently while reading screens. Use preservative-free artificial tear drops. Adjust screen brightness and keep screens slightly below eye level. Wear protective eyewear in dusty wind. Warning Signs: Persistent eye redness, corneal pain, or changes in vision require an eye doctor's evaluation.",
    "WHO - Blindness and visual impairment",
    "https://www.who.int/news-room/fact-sheets/detail/blindness-and-visual-impairment"
  ),
  t(
    "Earwax buildup, blocked ear, muffled hearing, ear fullness, wax plug",
    "Earwax (cerumen) protects the ear canal, but excess accumulation can cause a plugged feeling, partial hearing reduction, mild itching, or ringing. Home Care: Put 2-3 drops of clean olive oil, mineral oil, or medical wax-softening drops into the ear canal twice daily for 3 days to soften wax naturally. NEVER insert cotton buds, matchsticks, bobby pins, or keys into the ear canal; doing so rams wax deeper and can puncture the eardrum. Warning Signs: If you experience sharp ear pain, fluid or blood drainage, or dizziness, visit an ENT doctor for safe irrigation.",
    "WHO - Deafness and hearing loss",
    "https://www.who.int/news-room/fact-sheets/detail/deafness-and-hearing-loss"
  ),
  t(
    "Swimmer's ear, otitis externa, ear canal itch and pain when pulling earlobe",
    "Swimmer's ear is an infection of the outer ear canal lining caused by water remaining in the ear after swimming or bathing, allowing bacteria or fungi to grow. Symptoms include itching, redness, clear odorless fluid, and sharp pain when pulling the earlobe. Home Care: Keep the ear canal completely dry. Tilt head sideways after bathing to drain water. Avoid swimming until healed. Use a hairdryer on the lowest cool setting held 30 cm away to dry outer ear. Never scratch inside with objects. Warning Signs: Severe pain, fever, swollen lymph nodes, or thick pus requires prescription ear drops from a doctor.",
    "National Health Portal India - Ear infections",
    "https://www.nhp.gov.in"
  ),
  t(
    "Sore throat, pharyngitis, scratchy throat, painful swallowing",
    "A sore throat is irritation or inflammation of the pharynx, commonly caused by viral upper respiratory infections (common cold), dry indoor air, or smoking. Home Care: Gargle with warm salt water (half teaspoon salt in a glass of warm water) 3 to 4 times a day to reduce swelling and clear mucus. Drink warm fluids like water, ginger tea, or clear soups. Suck on throat lozenges. Rest voice and stay hydrated. Avoid smoking and second-hand smoke. Warning Signs: High fever, difficulty breathing, inability to swallow saliva (drooling), or white pus patches on tonsils requires clinic evaluation for bacterial strep.",
    "WHO - Management of respiratory infections",
    "https://www.who.int/teams/health-product-policy-and-standards"
  ),
  t(
    "Common cold, runny nose, sneezing, nasal congestion, seasonal sniffles",
    "The common cold is a viral infection of the upper respiratory tract causing a runny or stuffy nose, sneezing, scratchy throat, mild cough, and slight tiredness. Antibiotics do not kill cold viruses and are ineffective. Home Care: Rest adequately. Inhale warm steam to clear blocked nasal passages. Drink plenty of warm fluids (water, soups, herbal tea). Use saline nasal spray or drops to loosen thick mucus. Wash hands frequently to protect family members. Warning Signs: If symptoms persist beyond 10 days, fever exceeds 38.5C (101.3F), or breathing becomes difficult, visit a doctor.",
    "WHO - Common viral respiratory illnesses",
    "https://www.who.int/news-room/fact-sheets"
  ),
  t(
    "Nosebleed, epistaxis, bleeding from nose, first aid for bloody nose",
    "Nosebleeds occur when fragile blood vessels in the anterior nasal septum break due to dry air, vigorous nose-picking, allergies, or minor trauma. First Aid: Sit upright and lean slightly FORWARD (never tilt the head backward, which causes blood to run down the throat and trigger vomiting or choking). Firmly pinch the soft part of the nose just below the nasal bridge with thumb and index finger for 10 continuous minutes without letting go. Breathe through the mouth. Place an ice pack on the bridge of the nose. Warning Signs: If bleeding does not stop after 20 minutes of firm pressure, or follows heavy head injury, seek emergency hospital care immediately.",
    "National Health Portal India - First aid epistaxis",
    "https://www.nhp.gov.in"
  ),
  t(
    "Canker sores, aphthous mouth ulcers, painful sores inside cheek and lips",
    "Canker sores are small, painful, non-contagious ulcers that appear inside the lips, inner cheeks, or gums, with a white/yellow center and red border, triggered by stress, minor accidental biting, or spicy foods. Home Care: Rinse mouth with warm salt water or diluted baking soda solution. Avoid spicy, acidic, crunchy, or salty foods that sting. Apply an ice chip to the sore to numb pain. Maintain good oral hygiene with a soft-bristled toothbrush. Sores heal naturally in 7 to 10 days. Warning Signs: If an ulcer lasts longer than 3 weeks, grows unusually large, or makes eating impossible, see a dentist or doctor.",
    "National Health Portal India - Oral health",
    "https://www.nhp.gov.in"
  ),
  t(
    "Toothache, dental decay, cavity pain, sensitive tooth",
    "Toothache is usually caused by dental caries (cavities) reaching the sensitive inner tooth nerve, cracked enamel, or gum inflammation. Home Care: Rinse mouth thoroughly with warm salt water. Gently floss between teeth to dislodge trapped food particles. Apply an ice pack to the outside of the cheek for 15 minutes. Dab a small drop of clove oil on a clean cotton ball and place lightly near the aching tooth for temporary numbing. Avoid very hot, cold, or sugary drinks. Warning Signs: Facial swelling, swollen jaw, fever, or difficulty swallowing indicates a serious dental abscess requiring urgent dental or clinic care.",
    "WHO - Oral health fact sheet",
    "https://www.who.int/news-room/fact-sheets/detail/oral-health"
  )
];

// -----------------------------------------------------------------------------
// MODULE 4: RESPIRATORY & CHEST (35 Topics)
// -----------------------------------------------------------------------------
export const respiratoryTopics = [
  t(
    "Dry cough, tickly throat, non-productive cough, cough without phlegm",
    "A dry cough is a ticklish, irritating cough that does not produce mucus or phlegm, frequently following viral colds, respiratory allergies, air pollution, or acid reflux. Home Care: Drink warm water frequently throughout the day. Sip warm water with honey and lemon (never give honey to infants under 1 year due to infant botulism risk). Inhale warm steam. Use a humidifier or bowl of warm water in the room. Avoid smoke, incense, and sudden temperature shifts. Warning Signs: Seek immediate medical care if cough lasts over 2 weeks, produces blood, causes shortness of breath, or is accompanied by chest pain or night sweats.",
    "WHO - Clinical management of respiratory illness",
    "https://www.who.int/publications"
  ),
  t(
    "Wet cough, productive cough with mucus, chest congestion, phlegm",
    "A wet (productive) cough helps clear excess mucus and fluid from the airways and lungs, commonly associated with bronchitis, post-cold congestion, or respiratory infections. Home Care: Stay well-hydrated: drink plenty of warm water, broths, and herbal teas, which thin mucus so it can be cleared easily. Inhale steam 2 to 3 times daily. Keep your head elevated with an extra pillow while sleeping. Avoid cough suppressants that prevent clearing mucus unless advised by a doctor. Warning Signs: Coughing up rusty, green, or blood-streaked phlegm, high fever, or rapid breathing requires urgent clinic evaluation for pneumonia.",
    "WHO - Pneumonia fact sheet",
    "https://www.who.int/news-room/fact-sheets/detail/pneumonia"
  ),
  t(
    "Tuberculosis, TB symptoms, persistent cough over 2 weeks, Odisha NTEP",
    "Tuberculosis (TB) is a serious infectious bacterial disease caused by Mycobacterium tuberculosis, spreading through air droplets. Symptoms: Persistent cough lasting more than 2 weeks, low-grade evening fever, drenching night sweats, unexplained weight loss, loss of appetite, and coughing up blood (hemoptysis). Protocol: All testing (sputum microscopy, CBNAAT/Truenat) and complete 6-month DOTS treatment are provided completely FREE by the Government of Odisha under the National Tuberculosis Elimination Programme (NTEP). Visit your nearest Community Health Centre (CHC) or Primary Health Centre (PHC) immediately. Take the full medicine course without skipping.",
    "MoHFW India - National Tuberculosis Elimination Programme",
    "https://tbcindia.gov.in"
  ),
  t(
    "Bronchitis, acute bronchial inflammation, chest rattle, cough",
    "Acute bronchitis is inflammation of the bronchial airway tubes, usually triggered by a viral infection following a cold or flu, causing a persistent cough with clear or colored phlegm, mild chest soreness, and fatigue. Home Care: Get plenty of rest. Drink at least 8 to 10 glasses of warm water daily. Inhale warm steam to loosen chest tightness. Antibiotics are generally ineffective because over 90% of acute bronchitis cases are viral. Avoid exposure to cigarette smoke, kitchen chulha smoke, and dust. Warning Signs: Wheezing, breathlessness, fever above 38.5C, or symptoms lasting over 3 weeks require medical evaluation.",
    "WHO - Respiratory disease management",
    "https://www.who.int/health-topics/chronic-respiratory-diseases"
  ),
  t(
    "Asthma triggers, wheezing prevention, dust and smoke allergy, inhaler care",
    "Asthma is a chronic inflammatory disorder of the airways causing recurring episodes of wheezing, chest tightness, coughing, and shortness of breath when exposed to triggers like cold air, dust mites, pollen, pet dander, or smoke. Home Care: Identify and avoid personal triggers. Keep bedding washed and sun-dried. Avoid wood smoke and mosquito coils indoors. Always carry prescribed reliever inhalers. Take long slow breaths during mild tightness and sit upright. Warning Signs: If severe breathlessness prevents speaking in full sentences, chest pulls inward (retractions), or lips turn blue, call 108 or go to the emergency room immediately.",
    "WHO - Asthma fact sheet",
    "https://www.who.int/news-room/fact-sheets/detail/asthma"
  )
];

// -----------------------------------------------------------------------------
// MODULE 5: GASTROINTESTINAL, STOMACH & DIGESTION (45 Topics)
// -----------------------------------------------------------------------------
export const gastroTopics = [
  t(
    "Acid reflux, GERD, heartburn, burning chest sensation, acid burps",
    "Heartburn is a burning pain behind the breastbone caused by stomach acid regurgitating into the esophagus, often triggered by heavy, oily, or spicy meals, lying down after eating, or excess tea/coffee. Home Care: Eat smaller, more frequent meals. Avoid lying down for at least 2 to 3 hours after eating. Elevate the head of the bed by 6 inches. Avoid triggers like fried foods, citrus, onions, mint, and alcohol. Maintain a healthy body weight. Wear loose clothing around the abdomen. Warning Signs: Difficulty swallowing, food feeling stuck in the chest, vomiting blood, or black stools requires immediate medical evaluation; chest pain radiating to arm or jaw must be treated as an emergency.",
    "National Health Portal India - Gastroesophageal reflux disease",
    "https://www.nhp.gov.in"
  ),
  t(
    "Indigestion, dyspepsia, stomach fullness, bloating after food",
    "Indigestion (dyspepsia) involves discomfort or a painful, heavy feeling in the upper stomach, early fullness during meals, bloating, and mild nausea, often due to eating too fast, overeating, or stress. Home Care: Chew food thoroughly and eat at a relaxed pace. Drink warm water between meals rather than large gulps during meals. Sip ginger or mint tea. Avoid chewing gum or drinking carbonated sodas which swallow extra air. Take a gentle 15-minute walk after meals. Warning Signs: Unexplained weight loss, persistent vomiting, or difficulty swallowing requires medical attention.",
    "WHO - Noncommunicable diseases and digestive health",
    "https://www.who.int/publications"
  ),
  t(
    "Acute diarrhea, loose watery motions, gastroenteritis, dehydration prevention",
    "Acute diarrhea is the passage of 3 or more loose or watery stools per day, commonly caused by viral or bacterial contamination of food or water, leading to rapid loss of water and essential electrolytes. Home Care: Prevent dehydration immediately with Oral Rehydration Solution (ORS). Mix 1 full packet of WHO-formula ORS in 1 liter of clean drinking water; drink after every loose stool. Consume rice water (kanji), thin dal soup, tender coconut water, and plain salted buttermilk. Continue eating light digestible foods (khichdi, bananas, curd). Warning Signs: If stools contain blood, high fever develops, persistent vomiting prevents drinking, or eyes look sunken, visit a clinic immediately.",
    "WHO - Diarrhoeal disease fact sheet",
    "https://www.who.int/news-room/fact-sheets/detail/diarrhoeal-disease"
  ),
  t(
    "ORS preparation and dehydration signs, zinc supplementation",
    "Oral Rehydration Solution (ORS) is a life-saving mixture of clean water, salts, and glucose that restores lost fluids during diarrhea. Preparation: Dissolve one complete packet of WHO-standard ORS in exactly 1 liter of boiled and cooled water. Stir well. Discard any unused prepared solution after 24 hours and make fresh. Children with diarrhea should also receive dispersible Zinc tablets (20 mg daily for 14 days, 10 mg for infants under 6 months) under ASHA guidance to shorten diarrhea duration and protect against future episodes for 3 months. Warning Signs: Extreme lethargy, no urination for 6 hours, or rapid breathing requires hospital IV fluid therapy.",
    "WHO / UNICEF - Clinical management of acute diarrhoea",
    "https://www.who.int/publications/i/item/9241594217"
  ),
  t(
    "Constipation, hard stools, difficulty passing motion, kabz",
    "Constipation involves having fewer than 3 bowel movements per week, accompanied by hard, dry, lumpy stools and straining during defecation, usually linked to low dietary fiber, inadequate hydration, or physical inactivity. Home Care: Increase dietary fiber by eating whole grains, oats, papayas, green leafy vegetables, lentils, and prunes. Drink at least 8 to 10 glasses of water daily. Engage in 30 minutes of physical exercise like brisk walking. Establish a regular toilet routine, particularly after breakfast when colonic reflexes are strongest. Do not ignore the urge to defecate. Warning Signs: Severe abdominal pain, vomiting, inability to pass gas, or blood in stool requires medical evaluation.",
    "National Health Portal India - Constipation",
    "https://www.nhp.gov.in"
  ),
  t(
    "Hemorrhoids, piles, bleeding during bowel movement, swollen anal veins, bawaseer",
    "Piles (hemorrhoids) are swollen, inflamed veins in the lower rectum and anus, causing painless bright red bleeding during bowel movements, anal itching, and tender lumps around the anus, exacerbated by straining. Home Care: Take a warm sitz bath (sit in a tub of warm plain water for 15 minutes twice daily) to soothe inflammation. Prevent constipation by eating high-fiber foods and drinking plenty of water. Avoid straining or sitting on the toilet for prolonged periods. Use soft moist wipes instead of dry paper. Warning Signs: Heavy rectal bleeding, persistent dizziness, or a hard, intensely painful purple lump (thrombosed external hemorrhoid) requires clinic evaluation.",
    "National Health Portal India - Piles management",
    "https://www.nhp.gov.in"
  ),
  t(
    "Gas, flatulence, abdominal bloating, excessive burping",
    "Excess gas and bloating occur from swallowed air or the breakdown of undigested foods by gut bacteria in the colon, producing hydrogen, carbon dioxide, and methane. Home Care: Eat and drink slowly; avoid gulping food or talking while chewing. Avoid carbonated fizzy drinks, chewing gum, and drinking through straws. Limit notorious gas-forming foods temporarily (raw cabbage, cauliflower, beans, artificial sweeteners). Light walking after meals stimulates intestinal motility. Warning Signs: Bloating accompanied by severe persistent abdominal pain, unexplained weight loss, or persistent diarrhea requires medical investigation.",
    "National Health Portal India - Digestive health",
    "https://www.nhp.gov.in"
  ),
  t(
    "Nausea and vomiting, upset stomach, emesis home relief",
    "Nausea and vomiting are protective gastrointestinal reflexes triggered by food poisoning, viral gastroenteritis, motion sickness, or dietary indiscretion. Home Care: Rest the stomach: do not eat solid foods for a couple of hours after vomiting. Once vomiting pauses, take tiny sips of clear fluids (water, ORS, thin rice water) every 10 minutes. If fluids are tolerated, progress gradually to bland foods: bananas, rice, applesauce, toast (BRAT diet). Avoid fatty, greasy, or heavily spiced foods. Warning Signs: Inability to keep any fluids down for 24 hours, vomiting blood, green-yellow bile, or signs of severe dehydration requires immediate clinic care.",
    "WHO - Clinical guidelines for emergency care",
    "https://www.who.int/publications"
  )
];

// -----------------------------------------------------------------------------
// MODULE 6: MUSCULOSKELETAL, BONES & JOINTS (35 Topics)
// -----------------------------------------------------------------------------
export const musculoskeletalTopics = [
  t(
    "Ankle sprain, twisted ankle, foot ligament strain, R.I.C.E. protocol",
    "An ankle sprain happens when ligaments supporting the ankle stretch or tear after an awkward twist or roll, causing pain, swelling, tenderness, and bruising. First Aid: Follow the R.I.C.E. protocol: REST: Stop walking on the injured foot. ICE: Apply an ice pack wrapped in a towel for 15-20 minutes every 2-3 hours for the first 48 hours (never apply ice directly to bare skin). COMPRESSION: Wrap with an elastic crepe bandage firmly but not so tight as to cut off blood circulation. ELEVATION: Prop the ankle above heart level on pillows while resting. Warning Signs: Inability to take 4 steps immediately after injury, severe deformity, or bone tenderness suggests a fracture requiring X-ray.",
    "WHO - Rehabilitation in health systems",
    "https://www.who.int/health-topics/rehabilitation"
  ),
  t(
    "Lower back pain, lumbago, back muscle strain, posture ache",
    "Non-specific lower back pain is extremely common, usually caused by muscle strains, poor sitting posture, heavy improper lifting, or lack of core strength. Home Care: Stay gently active; avoid prolonged bed rest (more than 1-2 days of bed rest actually delays recovery). Apply cold packs for the first 48 hours, followed by warm compresses. When lifting objects, bend at the knees and hips, never at the waist. Sleep on a firm mattress with a pillow under the knees. Practice gentle walking and core stretching exercises. Warning Signs: Seek emergency medical care if back pain is accompanied by loss of bladder or bowel control, numbness around genitals/groin (saddle anesthesia), or weakness in both legs.",
    "WHO - Low back pain guidelines",
    "https://www.who.int/news-room/fact-sheets/detail/low-back-pain"
  ),
  t(
    "Neck pain, stiff neck, cervical muscle spasm, screen neck",
    "Neck stiffness and muscle spasms often develop from awkward sleeping positions, poor workstation ergonomics ('tech neck' from looking down at mobile phones), or drafty cold air. Home Care: Apply a warm compress or heating pad to the neck for 15 minutes. Perform gentle range-of-motion exercises: slowly turn the head side to side and tilt ear towards shoulder without forcing. Adjust phone and computer screens to eye level. Use a supportive, medium-firm pillow that keeps the neck aligned with the spine. Warning Signs: Sudden neck stiffness accompanied by high fever, severe headache, and light sensitivity is a sign of meningitis requiring emergency hospital care.",
    "National Health Portal India - Musculoskeletal health",
    "https://www.nhp.gov.in"
  ),
  t(
    "Knee pain, osteoarthritis, joint stiffness, aging joint wear",
    "Knee osteoarthritis is a degenerative joint condition where protective cartilage wears away over time, causing knee ache, morning stiffness lasting under 30 minutes, swelling, and cracking sensations during movement. Home Care: Maintain a healthy body weight to reduce mechanical load on knees (each kg lost relieves 4 kg of pressure on knees). Perform low-impact exercises: swimming, cycling, and quadriceps-strengthening leg raises. Apply warm packs before activity and cool packs after. Wear well-cushioned flat walking shoes. Warning Signs: If the knee becomes hot, red, and swollen, or cannot bear any weight, visit a clinic.",
    "WHO - Musculoskeletal health",
    "https://www.who.int/news-room/fact-sheets/detail/musculoskeletal-conditions"
  ),
  t(
    "Muscle cramps, nocturnal leg cramps, charley horse, calf spasms",
    "Muscle cramps are sudden, involuntary, painful contractions of a muscle, most commonly the calf or foot, triggered by muscle fatigue, dehydration, low potassium or magnesium, or prolonged sitting. Home Care: Gently stretch the cramping muscle immediately: for calf cramps, straighten the leg and pull the toes backward toward the shin. Massage the muscle firmly. Apply a warm towel or take a warm shower to relax tight fibers. Drink water or ORS to replace lost electrolytes. Stretch calves before going to bed. Warning Signs: Frequent recurring cramps with persistent leg swelling, redness, or skin changes require medical evaluation.",
    "National Health Portal India - Muscle disorders",
    "https://www.nhp.gov.in"
  )
];

// -----------------------------------------------------------------------------
// MODULE 7: UROLOGY & REPRODUCTIVE HEALTH (30 Topics)
// -----------------------------------------------------------------------------
export const urologyTopics = [
  t(
    "Urinary tract infection, UTI, burning urination, frequent urge to pee, dysuria",
    "A UTI occurs when bacteria (usually E. coli) enter the urethra and bladder, causing a burning sensation during urination (dysuria), frequent intense urges to urinate with small output, cloudy or foul-smelling urine, and lower pelvic pain. Home Care: Drink plenty of water (at least 2.5 to 3 liters daily) to flush bacteria out of the urinary tract. Urinate frequently and do not hold urine. Wipe from front to back after using the toilet. Urinate shortly after sexual intercourse. Avoid irritants like perfumed soaps and tight synthetic underwear. Warning Signs: If you develop high fever, chills, nausea, vomiting, or back/flank pain, bacteria may have reached the kidneys (pyelonephritis); seek urgent hospital care.",
    "WHO - Guidelines on urinary tract infections",
    "https://www.who.int/publications"
  ),
  t(
    "Dehydration urine color, dark yellow urine, hydration guide",
    "Urine color is a direct indicator of bodily hydration. Pale straw-yellow or clear urine indicates healthy hydration. Deep amber, honey, or dark yellow urine signals dehydration. Home Care: Drink 2 to 3 glasses of clean water immediately. In hot weather, outdoor manual labor, or during fever, increase fluid intake and drink coconut water, buttermilk, or ORS to maintain electrolyte balance. Warning Signs: If urine is cola-colored, red, or tea-colored despite drinking plenty of fluids, or accompanied by abdominal pain, consult a physician for liver or kidney assessment.",
    "National Health Portal India - Hydration",
    "https://www.nhp.gov.in"
  ),
  t(
    "Menstrual cramps, dysmenorrhea, period pain, lower belly cramps",
    "Primary dysmenorrhea is cramping lower abdominal or pelvic pain that starts just before or during menstruation, caused by natural uterine prostaglandins contracting the uterine muscle. Home Care: Apply a hot water bag or heating pad to the lower abdomen or lower back for 15-20 minutes. Drink warm water, chamomile, or ginger tea. Engage in light physical activity such as walking or gentle yoga stretches to stimulate pelvic blood circulation. Rest comfortably with knees bent towards chest. Warning Signs: Severe pain that does not respond to home measures, prevents daily activities, or is accompanied by unusually heavy bleeding requires a gynecological check-up.",
    "WHO - Sexual and reproductive health",
    "https://www.who.int/teams/sexual-and-reproductive-health-and-research"
  ),
  t(
    "Vaginal yeast infection, candidiasis, thick white cottage cheese discharge, vaginal itching",
    "Vaginal yeast infection (candidiasis) is an overgrowth of Candida fungus in the vagina, causing intense vaginal itching, burning during urination, redness of the vulva, and thick, white, odorless discharge resembling cottage cheese. Home Care: Keep the genital area clean and completely dry. Wear loose-fitting, breathable 100% cotton underwear. Avoid scented soaps, bubble baths, douches, and feminine hygiene sprays which disrupt normal vaginal pH. Change out of wet swimsuits promptly. Over-the-counter or doctor-prescribed antifungal vaginal pessaries/creams clear the infection. Warning Signs: If discharge is foul-smelling, greenish, or accompanied by pelvic pain or fever, visit a clinic.",
    "WHO - Reproductive tract infections",
    "https://www.who.int/health-topics/reproductive-health"
  )
];

// -----------------------------------------------------------------------------
// MODULE 8: TROPICAL, VECTOR-BORNE & INFECTIOUS (35 Topics)
// -----------------------------------------------------------------------------
export const tropicalTopics = [
  t(
    "Dengue fever, aedes mosquito, high fever, joint pain, platelet warning signs",
    "Dengue is a viral infection transmitted by day-biting Aedes mosquitoes. Symptoms: Sudden high fever, severe retro-orbital eye pain, bone and joint aches ('breakbone fever'), skin rash, and nausea. Home Care: Rest completely in bed under a mosquito net to prevent infecting others. Hydrate vigorously with ORS, coconut water, fruit juices, and soups to prevent hemoconcentration. Paracetamol can be taken for fever; NEVER take aspirin, ibuprofen, or diclofenac as they increase bleeding risks. Warning Signs: Seek emergency hospital care immediately if you notice severe abdominal pain, persistent vomiting, bleeding from gums/nose, black stools, extreme restlessness, or sudden drop in body temperature with clammy skin.",
    "WHO - Dengue and severe dengue fact sheet",
    "https://www.who.int/news-room/fact-sheets/detail/dengue-and-severe-dengue"
  ),
  t(
    "Malaria, anopheles mosquito, cyclical chills, high fever, sweating paroxysms",
    "Malaria is caused by Plasmodium parasites transmitted through bites of female Anopheles mosquitoes. Symptoms: Cyclical attacks (paroxysms) of intense cold shivering and chills, followed by spiking high fever, and concluding with profuse drenching sweating and exhaustion. Protocol: In Odisha, malaria is widespread; test immediately at any CHC, PHC, or with an ASHA worker using Rapid Diagnostic Kits (RDK) or blood smear. Complete the full prescribed course of Artemisinin-based Combination Therapy (ACT). Sleep under insecticide-treated bed nets (LLIN). Clear stagnant water collections. Warning Signs: Confusion, convulsions, inability to sit, or jaundice indicates cerebral/severe malaria requiring immediate emergency hospital care.",
    "WHO - Malaria fact sheet",
    "https://www.who.int/news-room/fact-sheets/detail/malaria"
  ),
  t(
    "Rabies prevention, dog bite first aid, animal scratch protocol",
    "Rabies is a 100% fatal but 100% preventable viral disease transmitted through the saliva of infected mammals (dogs, cats, monkeys, bats) via bites, scratches, or contact with broken skin. Emergency First Aid: IMMEDIATELY wash the bite or scratch wound thoroughly under running tap water with soap for at least 15 FULL MINUTES. Apply povidone-iodine or antiseptic. Do NOT apply chili powder, lime, oil, or turmeric to the wound. Do NOT bandage or suture the wound tightly. Go IMMEDIATELY to the nearest Government Hospital for Anti-Rabies Vaccine (ARV) and Rabies Immunoglobulin (RIG). Starting vaccination on Day 0 is crucial.",
    "WHO - Rabies fact sheet",
    "https://www.who.int/news-room/fact-sheets/detail/rabies"
  ),
  t(
    "Typhoid fever, enteric fever, salmonella typhi, step-ladder fever",
    "Typhoid is a bacterial infection caused by Salmonella typhi spread through contaminated food and drinking water. Symptoms: Sustained high fever rising in a step-ladder pattern, headache, abdominal pain, constipation or diarrhea, weakness, and dry cough. Prevention & Care: Drink only boiled or certified purified water. Wash hands thoroughly before eating. Eat freshly cooked, hot food; peel fruits yourself. Avoid raw roadside street foods. Typhoid requires prescription antibiotics following blood/Widal testing. Warning Signs: Severe persistent abdominal pain, vomiting blood, or confusion indicates intestinal perforation requiring urgent surgery.",
    "WHO - Typhoid fact sheet",
    "https://www.who.int/news-room/fact-sheets/detail/typhoid"
  ),
  t(
    "Chikungunya, viral fever, severe incapacitating joint pain",
    "Chikungunya is a viral disease spread by Aedes mosquitoes characterized by sudden fever and debilitating, severe joint pain (polyarthralgia), commonly in wrists, hands, and ankles, often accompanied by rash. Home Care: Rest completely. Stay well-hydrated with fluids and ORS. Apply cold compresses to swollen, tender joints to ease stiffness. Paracetamol may be used for fever under health worker guidance; avoid aspirin and NSAIDs until dengue is ruled out. Joint pain may persist for weeks or months. Warning Signs: Inability to drink fluids, severe drowsiness, or bleeding requires immediate hospital care.",
    "WHO - Chikungunya fact sheet",
    "https://www.who.int/news-room/fact-sheets/detail/chikungunya"
  )
];

// -----------------------------------------------------------------------------
// MODULE 9: FIRST AID, BURNS, BITES & ACCIDENTS (35 Topics)
// -----------------------------------------------------------------------------
export const firstAidTopics = [
  t(
    "Minor burns, thermal scalds, boiling water burns, first-degree burn first aid",
    "Minor first-degree burns affect only the outer skin layer, causing redness, swelling, and pain without large open blisters. First Aid: IMMEDIATELY cool the burn under gentle, cool running tap water for 15 to 20 minutes (do NOT use freezing ice or ice water, as extreme cold causes frostbite damage to burned tissue). Do NOT apply toothpaste, butter, raw egg, ghee, or mud, which introduce bacterial infections. Cover loosely with a clean, dry, sterile cloth. Warning Signs: If burns cover large areas, face, hands, groin, or result in charred white/black skin (third-degree), go immediately to the hospital burn unit.",
    "WHO - Burns fact sheet",
    "https://www.who.int/news-room/fact-sheets/detail/burns"
  ),
  t(
    "Snake bite emergency, venomous snakebite first aid, anti-snake venom",
    "Snakebites from venomous snakes (Cobras, Kraits, Vipers) are life-threatening medical emergencies. Protocol: Call 108 or arrange immediate transport to a Community Health Centre with Anti-Snake Venom (ASV). Keep the victim calm and strictly IMMOBILIZE the bitten limb below heart level with a splint. Remove rings, watches, and tight clothing before swelling begins. DO NOT cut the wound with blades. DO NOT attempt to suck out venom. DO NOT tie a tight tourniquet (which causes gangrene). DO NOT apply herbal pastes or electrical shocks. Administering ASV at a hospital is the ONLY effective cure.",
    "WHO - Snakebite envenoming fact sheet",
    "https://www.who.int/news-room/fact-sheets/detail/snakebite-envenoming"
  ),
  t(
    "Choking first aid, airway obstruction, Heimlich maneuver, adult and child",
    "Choking occurs when a foreign object lodges in the throat or windpipe, blocking the flow of air. If the person can cough forcefully, encourage them to keep coughing. If the person CANNOT speak, cry, cough, or breathe (universal choking sign: hands clutching throat): Act immediately. Stand behind the person, wrap arms around waist, make a fist with one hand just above the navel, grasp the fist with the other hand, and give quick, upward abdominal thrusts (Heimlich maneuver) until the object is expelled. For unconscious choking victims, call 108 and begin chest compressions immediately.",
    "WHO - Emergency trauma care",
    "https://www.who.int/publications"
  ),
  t(
    "Heat exhaustion, extreme summer heat, Odisha loo, heat cramps",
    "Heat exhaustion results from prolonged exposure to high temperatures and inadequate fluid/salt replacement. Symptoms: Heavy sweating, paleness, muscle cramps, tiredness, weakness, dizziness, headache, and nausea. First Aid: Move the person immediately to a cool, shaded, or air-conditioned room. Loosen or remove tight clothing. Apply cool, wet towels to the neck, forehead, and armpits. Give cool water, ORS, or salted lemon water in small sips. Fan the person. Warning Signs: If body temperature exceeds 40C (104F), sweating ceases, or the person becomes confused, unconscious, or delirious, this is HEAT STROKE—call 108 immediately.",
    "NDMA India - National guidelines on heat wave management",
    "https://ndma.gov.in"
  ),
  t(
    "Minor cuts, scrapes, abrasions, wound cleaning, antiseptic dressing",
    "Minor cuts and scrapes break the skin surface with minimal bleeding. First Aid: Wash hands with soap. Apply direct gentle pressure with a clean cloth for 2-3 minutes to stop bleeding. Clean the wound under gentle running tap water to wash away dirt and debris. Clean around the wound with mild soap. Apply a thin layer of petroleum jelly or antiseptic ointment to keep the surface moist. Cover with a sterile adhesive bandage. Change the bandage daily. Warning Signs: If the cut is deep, gaping, caused by rusty objects, or shows signs of redness, warmth, and pus, visit a clinic for stitches or a tetanus toxoid (TT) booster.",
    "National Health Portal India - First aid cuts",
    "https://www.nhp.gov.in"
  )
];

// Combine all datasets
export const allNewTopics = [
  ...dermatologyTopics,
  ...neurologyTopics,
  ...entTopics,
  ...respiratoryTopics,
  ...gastroTopics,
  ...musculoskeletalTopics,
  ...urologyTopics,
  ...tropicalTopics,
  ...firstAidTopics
];

console.log('Total modules compiled:', allNewTopics.length);
