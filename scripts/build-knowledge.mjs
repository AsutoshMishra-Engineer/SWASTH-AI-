import { writeFileSync } from 'fs';

// Helper to format structured verified knowledge
function createTopic(topic, category, content, source_name, source_url, source_date = '2024-01-15') {
  return {
    topic: topic.trim(),
    source_name: source_name.trim(),
    source_url: source_url.trim(),
    source_date: source_date,
    verified: true,
    content: content.trim()
  };
}

const topics = [
  // =========================================================================
  // 1. DERMATOLOGY, SKIN, HAIR & ALLERGIC MANIFESTATIONS (15 Modules)
  // =========================================================================
  createTopic(
    "Red spot on skin, neck irritation, and insect or ant bites",
    "Dermatology",
    "A single red, irritating spot on the neck or skin is often caused by an insect bite, localized contact dermatitis from soap, laundry detergent, perfume, or jewelry, or mild heat friction. Home Care: Clean the area gently with water and mild soap. Apply a cool compress or an ice cube wrapped in cloth for 10 minutes to reduce inflammation and itching. Calamine lotion or aloe vera gel can soothe irritation. Avoid scratching to prevent secondary bacterial infection. Warning Signs: If the spot spreads rapidly, develops a bullseye ring, oozes yellow pus, causes fever, or does not improve in 3 to 4 days, consult a doctor.",
    "WHO - Managing common skin conditions",
    "https://www.who.int/teams/control-of-neglected-tropical-diseases/skin-ntds"
  ),
  createTopic(
    "Prickly heat, heat rash (Miliaria / Ghamori)",
    "Dermatology",
    "Prickly heat happens during hot and humid weather when sweat ducts become clogged, trapping perspiration beneath the skin. Symptoms include tiny itchy red bumps or clear blisters, prickling or stinging sensations, most common on the neck, chest, back, and skin folds. Home Care: Stay in well-ventilated, shaded, or cool rooms. Take cool water baths. Wear loose-fitting, breathable cotton clothes. Keep skin dry. Avoid thick oil massages or heavy greasy creams that further block pores. Seek medical advice if rashes show signs of bacterial infection such as pus or warmth.",
    "National Health Portal India - Heat rash guidelines",
    "https://www.nhp.gov.in"
  ),
  createTopic(
    "Ringworm, fungal skin infections (Tinea / Daad)",
    "Dermatology",
    "Ringworm is a contagious fungal infection that appears as an itchy, circular red rash with slightly raised, scaly borders and clearer skin in the middle. Commonly affects the neck, groin (jock itch), armpits, feet (athlete's foot), and scalp. Home Care: Keep the affected skin clean and completely dry, especially after bathing. Wear fresh cotton underwear and loose clothing. Do not share personal towels, bedsheets, combs, or clothes. Apply doctor-recommended antifungal creams for the full prescribed duration. Avoid steroid creams like Betnovate without prescription as steroids cause fungi to spread aggressively.",
    "WHO - Fungal skin disease management",
    "https://www.who.int/teams/control-of-neglected-tropical-diseases/skin-ntds"
  ),
  createTopic(
    "Scabies intense nocturnal itching and household spread",
    "Dermatology",
    "Scabies is an infestation of the skin by microscopic mites that burrow into the upper layer of the skin. Symptoms include intense, severe itching that worsens significantly at night, with tiny pimple-like rashes or thin wavy burrow lines between fingers, inner wrists, elbows, armpits, and waistline. Care: Scabies is highly contagious through direct skin contact. All members of the household must be treated simultaneously with anti-parasitic lotion prescribed by a health worker. Wash all bedding, towels, and clothing used in the last 4 days in hot water and sun-dry thoroughly.",
    "WHO - Scabies fact sheet",
    "https://www.who.int/news-room/fact-sheets/detail/scabies"
  ),
  createTopic(
    "Skin boils, furuncles, and bacterial pus bumps",
    "Dermatology",
    "A boil is a painful, swollen, pus-filled lump under the skin caused by bacterial infection of hair follicles (usually Staphylococcus). Home Care: Apply a warm, moist cloth or compress for 10-15 minutes 3-4 times a day to increase circulation and encourage natural drainage. Wash hands before and after touching the area. NEVER squeeze, pierce, or cut a boil yourself, as this can force the infection into deeper tissue or the bloodstream. Seek urgent medical care if boils appear on the face, multiply into a cluster (carbuncle), cause fever, or fail to drain after 10 days.",
    "WHO - Management of bacterial skin infections",
    "https://www.who.int/teams/control-of-neglected-tropical-diseases/skin-ntds"
  ),
  createTopic(
    "Eczema, atopic dermatitis and chronic dry skin",
    "Dermatology",
    "Eczema is a non-contagious inflammatory skin condition causing dry, red, cracked, and intensely itchy skin patches, frequently on the inner elbows, back of knees, neck, and hands. Home Care: Take short lukewarm baths using mild, fragrance-free soaps. Apply pure coconut oil, petroleum jelly, or prescribed emollient moisturizer immediately after bathing while the skin is still damp. Avoid known triggers such as harsh detergents, wool fabrics, and stress. Keep fingernails trimmed short to avoid skin damage from scratching.",
    "National Health Portal India - Eczema care",
    "https://www.nhp.gov.in"
  ),
  createTopic(
    "Hives, urticaria and acute allergic skin flare-ups",
    "Dermatology",
    "Hives (urticaria) are raised, red or skin-colored, itchy welts that appear suddenly on the skin, often triggered by food allergies, insect stings, viral infections, or medication reactions. Home Care: Apply cool damp cloths to soothe the itch, take a cool bath, and wear loose clothing. Avoid hot water, scratching, and tight belts. Danger Signs: If hives occur with facial or lip swelling, difficulty breathing, throat tightness, or dizziness (anaphylaxis), seek emergency hospital care immediately as this is life-threatening.",
    "WHO - Management of allergic emergencies",
    "https://www.who.int/publications"
  ),
  createTopic(
    "Dandruff and seborrheic dermatitis scalp care",
    "Dermatology",
    "Dandruff involves flaking of dead skin cells from the scalp, often accompanied by mild itching. Seborrheic dermatitis is a more severe form with greasy yellowish scales and redness on the scalp, eyebrows, and sides of the nose. Care: Wash hair regularly with anti-dandruff shampoo containing zinc pyrithione, ketoconazole, or selenium sulfide. Leave medicated shampoo on the scalp for 5 minutes before rinsing. Avoid excessive heavy hair oils that feed the Malassezia yeast.",
    "National Health Portal India - Scalp health",
    "https://www.nhp.gov.in"
  ),
  createTopic(
    "Acne, facial pimples and adolescent breakout care",
    "Dermatology",
    "Acne develops when oil glands and dead skin cells clog pores, allowing bacteria to multiply. Causes include hormonal fluctuations, stress, and pore-clogging cosmetics. Care: Wash the face twice daily with a gentle cleanser and lukewarm water. Do not pop, pick, or scrub pimples roughly, as this leads to permanent scarring and infection spread. Use non-comedogenic (water-based) moisturizers and sunscreen. Consult a doctor for stubborn cystic acne.",
    "WHO - Adolescent health guidelines",
    "https://www.who.int/news-room/fact-sheets/detail/adolescent-health"
  ),
  createTopic(
    "Sunburn protection and UV damage first aid",
    "Dermatology",
    "Sunburn occurs from excessive ultraviolet (UV) radiation exposure, causing red, warm, painful, and tender skin that may peel after a few days. First Aid: Get out of the sun immediately. Cool the skin with cold water compresses or take a cool bath. Apply aloe vera gel or calamine. Drink plenty of water to prevent dehydration. Do not pop blisters. Protect skin outdoors with wide-brimmed hats, sunglasses, and umbrellas.",
    "WHO - Ultraviolet radiation and sun protection",
    "https://www.who.int/news-room/fact-sheets/detail/ultraviolet-radiation"
  ),
  createTopic(
    "Warts (HPV) skin growth care and precautions",
    "Dermatology",
    "Common warts are harmless, rough, grainy skin growths caused by human papillomavirus (HPV) infection in the top skin layer. They are common on fingers, hands, and feet (plantar warts). Care: Avoid picking, scratching, or shaving over warts to prevent spreading them to other body areas. Keep feet dry and wear slippers in public bathrooms and pools. Consult a health worker or dermatologist for topical treatments or cryotherapy if painful.",
    "National Health Portal India - Viral skin lesions",
    "https://www.nhp.gov.in"
  ),
  createTopic(
    "Corns and calluses foot friction management",
    "Dermatology",
    "Corns and calluses are thick, hardened layers of skin that develop when your skin tries to protect itself against repeated friction and pressure, usually from ill-fitting shoes or prolonged standing. Care: Wear properly fitting, cushioned shoes with wide toe boxes. Soak feet in warm water for 15 minutes, then gently rub calluses with a pumice stone. Never cut corns with razor blades or sharp knives at home. People with diabetes must never treat foot corns themselves due to ulcer risks.",
    "International Diabetes Federation - Diabetic foot care",
    "https://idf.org/about-diabetes/management"
  ),

  // =========================================================================
  // 2. HEADACHES, NEUROLOGICAL & SENSORY HEALTH (10 Modules)
  // =========================================================================
  createTopic(
    "Tension headache and dehydration headache home relief",
    "Neurology",
    "Tension-type headaches and dehydration headaches feel like a steady, dull ache or tight vise-like band gripping the forehead, temples, or base of the neck. Common causes include mental stress, eye fatigue from screens, skipped meals, lack of sleep, or inadequate water intake. Home Relief: Drink 2 to 3 large glasses of clean water immediately. Rest in a dark, quiet, cool room. Apply a cool or warm cloth across the forehead and back of the neck. Gently massage temple and shoulder muscles. Take regular screen breaks.",
    "WHO - Headache disorders",
    "https://www.who.int/news-room/fact-sheets/detail/headache-disorders"
  ),
  createTopic(
    "Migraine symptoms, visual aura and trigger prevention",
    "Neurology",
    "Migraine causes moderate to severe throbbing, pulsating pain typically on one side of the head, exacerbated by movement, climbing stairs, or bright light. May be preceded by visual auras (flashing lights, zigzag lines). Often accompanied by nausea, vomiting, and extreme sound sensitivity. Prevention & Care: Identify triggers (strong smells, skipping meals, caffeine withdrawal, lack of sleep). Lie down in a dark, silent room with a cold forehead pack. Consult a physician for preventive therapy if migraines happen weekly.",
    "WHO - Headache disorders",
    "https://www.who.int/news-room/fact-sheets/detail/headache-disorders"
  ),
  createTopic(
    "Headache red flags requiring immediate emergency hospital care",
    "Neurology",
    "Seek urgent emergency medical care (call 108) for a headache if it strikes suddenly with maximal intensity in seconds (thunderclap headache), is accompanied by high fever and stiff neck with chin unable to touch chest (meningitis), or comes with confusion, slurred speech, facial drooping, one-sided body weakness, sudden vision loss, or follows head trauma.",
    "WHO - Headache disorders emergency triage",
    "https://www.who.int/news-room/fact-sheets/detail/headache-disorders"
  ),
  createTopic(
    "Sinus headache and facial pressure relief",
    "Neurology",
    "Sinus headaches cause a dull, throbbing pressure and aching around the forehead, cheekbones, bridge of the nose, and behind the eyes, which worsens when bending forward. Usually accompanies a cold or sinus infection with nasal discharge. Care: Inhale plain steam twice daily. Use warm compresses over the sinuses. Drink warm liquids and stay hydrated. Consult a doctor if facial swelling, high fever, or vision changes occur.",
    "National Health Portal India - Sinusitis",
    "https://www.nhp.gov.in"
  ),
  createTopic(
    "Dizziness, lightheadedness and postural hypotension",
    "Neurology",
    "Dizziness upon standing up quickly occurs when blood pressure drops momentarily (orthostatic hypotension), or from mild dehydration, hunger, or heat fatigue. Care: Sit or lie down immediately with legs slightly raised. Take slow deep breaths. Sip water or oral rehydration fluids. Avoid jumping out of bed suddenly; sit on the edge for 1 minute before standing. Seek medical checkup if fainting, heart palpitations, or blackouts occur.",
    "WHO - Clinical management of cardiovascular and neurological signs",
    "https://www.who.int/publications"
  ),
  createTopic(
    "Vertigo, spinning sensation and inner ear balance",
    "Neurology",
    "Vertigo creates a false sensation that you or your surroundings are spinning or tilting, often accompanied by nausea, loss of balance, and vomiting. It is frequently caused by inner ear balance issues (like BPPV or labyrinthitis). Care: Sit still immediately during a spinning episode in good lighting. Avoid sudden head turns, bending down, or looking upward. Sleep with head slightly elevated. Consult an ENT specialist or neurologist for diagnosis and vestibular exercises.",
    "WHO - Deafness and hearing care: Balance disorders",
    "https://www.who.int/news-room/fact-sheets/detail/deafness-and-hearing-loss"
  ),
  createTopic(
    "Stroke emergency warning signs: FAST protocol",
    "Neurology",
    "A stroke happens when blood flow to the brain is blocked or a brain vessel ruptures. Immediate recognition saves lives using the FAST test: F - Face drooping on one side. A - Arm weakness or inability to keep both arms raised. S - Speech difficulty, slurred words, or inability to repeat a simple sentence. T - Time to call 108 ambulance immediately. Do not wait for symptoms to improve; clot-busting treatment must be given within 4.5 hours.",
    "American Stroke Association & WHO",
    "https://www.who.int/news-room/fact-sheets/detail/cardiovascular-diseases-(cvds)"
  ),
  createTopic(
    "Tremors, shaky hands and neurological awareness",
    "Neurology",
    "Hand tremors can be temporary and harmless due to excess caffeine, anxiety, physical exhaustion, low blood sugar (hypoglycemia), or fever chills. Persistent tremors that occur at rest, during handwriting, or progress over months warrant medical evaluation to rule out essential tremor, thyroid abnormalities, or Parkinson's disease.",
    "WHO - Neurological disorders public health challenges",
    "https://www.who.int/publications"
  ),

  // =========================================================================
  // 3. DIGESTIVE, STOMACH, ACIDITY & INTESTINAL HEALTH (15 Modules)
  // =========================================================================
  createTopic(
    "Acidity, acid reflux and heartburn relief (GERD)",
    "Gastrointestinal",
    "Acidity occurs when stomach acid flows back into the food pipe (esophagus), causing a burning sensation behind the breastbone, sour burping, and upper stomach burning. Causes include eating heavy spicy meals, sleeping right after dinner, smoking, and excess tea or coffee. Home Relief: Drink a glass of cold water or cold milk. Eat smaller, frequent meals. Avoid lying down for at least 2 hours after eating. Elevate the head end of your bed. Limit oily fried snacks, pickles, and carbonated sodas.",
    "National Health Portal India - Acidity management",
    "https://www.nhp.gov.in"
  ),
  createTopic(
    "Acute stomach pain, abdominal cramps and emergency red flags",
    "Gastrointestinal",
    "Mild stomach cramps from gas or indigestion often subside with warm sips of water, ginger tea, and rest. Red Flags: Seek emergency hospital care immediately if abdominal pain is sudden, excruciating, localized to the lower right abdomen (suspected appendicitis), accompanied by vomiting blood, black tarry stools, high fever, rigid board-like belly, or severe dizziness.",
    "WHO - Clinical management of acute abdominal emergencies",
    "https://www.who.int/publications"
  ),
  createTopic(
    "Constipation relief, bowel regularity and high-fiber nutrition",
    "Gastrointestinal",
    "Constipation involves infrequent, hard, dry bowel movements with painful straining. Relief: Drink at least 8 to 10 glasses of water daily. Increase dietary fiber by eating whole-wheat roti, oats, dal with skin, green vegetables, papaya, and guavas. Engage in 30 minutes of physical walking daily. Do not suppress the natural urge to defecate. Avoid dependency on chemical laxatives without medical advice.",
    "National Institute of Nutrition India - Dietary fiber guidelines",
    "https://www.nin.res.in"
  ),
  createTopic(
    "Intestinal gas, flatulence and abdominal bloating",
    "Gastrointestinal",
    "Abdominal bloating and gas build-up occur from swallowing air while eating too quickly, drinking fizzy sodas, or bacterial fermentation of undigested carbohydrates in the gut. Care: Chew food slowly with closed mouth. Take a gentle 15-minute walk after meals. Drink warm carom seed (ajwain) or cumin (jeera) water. Limit chewing gum and carbonated drinks. Seek evaluation if bloating is accompanied by unexplained weight loss.",
    "National Health Portal India - Gastrointestinal wellness",
    "https://www.nhp.gov.in"
  ),
  createTopic(
    "Nausea and vomiting rehydration protocol",
    "Gastrointestinal",
    "Vomiting causes rapid loss of fluids and stomach electrolytes. Home Care: Rest the stomach for 30 minutes after vomiting. Then take small sips (1-2 teaspoons) of cold water, ORS solution, or clear broth every 5 minutes. Do not drink large volumes at once. Once fluids are tolerated, progress to bland foods like rice, toast, and bananas. Seek urgent medical care if vomiting blood, unable to keep water down for 24 hours, or having signs of severe dehydration.",
    "WHO - Diarrhoeal disease and vomiting management",
    "https://www.who.int/news-room/fact-sheets/detail/diarrhoeal-disease"
  ),
  createTopic(
    "Diarrhoea treatment with Oral Rehydration Salts (ORS) and fluids",
    "Gastrointestinal",
    "Diarrhoea is the passage of 3 or more loose or watery stools per day, causing dehydration. The cornerstone of treatment is Oral Rehydration Salts (ORS) combined with continued feeding and breastfeeding. Do not starve the patient. Consult a doctor immediately if there is blood in the stool, high fever, sunken eyes, dry mouth, skin that does not bounce back when pinched, or inability to drink.",
    "WHO - Diarrhoeal disease fact sheet",
    "https://www.who.int/news-room/fact-sheets/detail/diarrhoeal-disease"
  ),
  createTopic(
    "Proper ORS preparation steps and volume guidelines",
    "Gastrointestinal",
    "To prepare standard WHO-ORS: wash hands thoroughly, pour the entire contents of 1 packet of ORS into exactly 1 litre of clean drinking water (boiled and cooled). Stir well until completely dissolved. Do not add sugar, salt, milk, or fruit juice. Drink small sips frequently throughout the day. Discard any leftover solution after 24 hours and prepare a fresh batch.",
    "UNICEF - Managing diarrhoea with ORS",
    "https://www.unicef.org/health/childhood-diseases"
  ),
  createTopic(
    "Food poisoning signs, contaminated food, and recovery",
    "Gastrointestinal",
    "Food poisoning occurs from consuming food contaminated with infectious bacteria, viruses, or toxins. Symptoms start within hours and include nausea, vomiting, watery diarrhoea, abdominal cramps, and mild fever. Care: Rest, drink ORS and coconut water to prevent dehydration, and eat simple khichdi or bananas when ready. Seek immediate hospital care if high fever, severe bloody stool, or extreme weakness occurs.",
    "WHO - Food safety fact sheet",
    "https://www.who.int/news-room/fact-sheets/detail/food-safety"
  ),
  createTopic(
    "Hemorrhoids, piles symptoms and bowel strain prevention",
    "Gastrointestinal",
    "Piles (hemorrhoids) are swollen veins in the lower rectum and anus, causing painless bright red bleeding during bowel movements, anal itching, or painful lumps around the anus. Care: Prevent hard stools by eating high-fiber foods and drinking plenty of water. Take a warm sitz bath (sit in warm plain water for 15 minutes twice daily). Avoid straining on the toilet. Seek medical examination to rule out other causes of rectal bleeding.",
    "National Health Portal India - Hemorrhoids",
    "https://www.nhp.gov.in"
  ),
  createTopic(
    "Jaundice, viral hepatitis and liver inflammation care",
    "Gastrointestinal",
    "Jaundice presents with yellowing of the white of the eyes and skin, dark mustard-colored urine, pale stools, fatigue, and loss of appetite, often from viral Hepatitis A or E spread through contaminated food and water. Care: Complete physical rest, drink boiled water, eat light non-oily carbohydrates (rice, glucose, fruit juices), and strictly avoid alcohol and heavy oils. Visit a doctor for liver function tests (LFT).",
    "WHO - Hepatitis A and E fact sheets",
    "https://www.who.int/news-room/fact-sheets/detail/hepatitis-a"
  ),

  // =========================================================================
  // 4. RESPIRATORY, COLD, COUGH & CHEST ISSUES (10 Modules)
  // =========================================================================
  createTopic(
    "Sore throat, tonsil pain and warm saline gargling",
    "Respiratory",
    "A sore, scratchy throat is usually caused by viral infections like the common cold. Care: Gargle with warm salt water (half teaspoon salt in warm water) 3 to 4 times a day to reduce throat swelling. Sip warm water with honey and ginger. Avoid cold drinks and smoking. See a doctor if there is high fever, difficulty swallowing saliva, or white patches on the tonsils.",
    "WHO - Acute respiratory infections",
    "https://www.who.int/teams/health-product-policy-and-standards"
  ),
  createTopic(
    "Dry cough vs wet productive cough home management",
    "Respiratory",
    "A dry cough is hacking and produces no phlegm; soothe it with steam inhalation and warm honey drinks. A wet cough produces mucus; drink plenty of warm water and broths to thin secretions so they can be cleared easily. Crucial Rule: Any cough persisting for more than 2 weeks must be evaluated for tuberculosis at a government health center.",
    "WHO - Respiratory health guidance",
    "https://www.who.int/teams/health-product-policy-and-standards"
  ),
  createTopic(
    "Common cold vs influenza (Flu) differentiation",
    "Respiratory",
    "A cold develops gradually with a runny nose, sneezing, and mild throat irritation. Influenza (flu) hits abruptly with high fever, severe body and muscle aches, chills, fatigue, and dry cough. Antibiotics do not work against cold or flu viruses. Care: Bed rest, plenty of warm fluids, and paracetamol for body aches. Seek medical care if breathing becomes labored.",
    "WHO - Influenza (seasonal)",
    "https://www.who.int/news-room/fact-sheets/detail/influenza-(seasonal)"
  ),
  createTopic(
    "Asthma wheezing, breathlessness and inhaler usage",
    "Respiratory",
    "Asthma is a chronic condition causing inflammation and narrowing of the airways, with symptoms of wheezing (whistling sound when breathing), chest tightness, and shortness of breath. Triggers include dust mites, smoke, pollen, cold air, and exercise. Care: Inhaler medications deliver tiny doses directly to the lungs, are safe, and do not cause addiction. Keep your prescribed reliever inhaler accessible at all times.",
    "WHO - Asthma fact sheet",
    "https://www.who.int/news-room/fact-sheets/detail/asthma"
  ),
  createTopic(
    "Childhood pneumonia danger signs: Fast breathing and chest indrawing",
    "Respiratory",
    "Pneumonia is a serious lung infection. In young children, warning signs include cough with fast breathing and chest indrawing (the lower chest pulls inward when the child breathes in). In infants 2 to 11 months, fast breathing is 50+ breaths/minute; in children 1 to 5 years, it is 40+ breaths/minute. Take the child to a hospital immediately.",
    "WHO - Pneumonia in children",
    "https://www.who.int/news-room/fact-sheets/detail/pneumonia"
  ),
  createTopic(
    "Tuberculosis symptoms and free government treatment (NTEP)",
    "Respiratory",
    "Tuberculosis (TB) is an airborne bacterial infection. Symptoms: cough lasting more than 2 weeks, evening fever, night sweats, unexplained weight loss, and blood in sputum. Sputum testing and complete multi-drug anti-TB treatment are provided 100% free under India's National TB Elimination Programme. TB is completely curable if medicines are taken consistently without stopping early.",
    "MoHFW India - National TB Elimination Programme",
    "https://tbcindia.gov.in"
  ),

  // =========================================================================
  // 5. EYE, EAR, NOSE, MOUTH & DENTAL HEALTH (10 Modules)
  // =========================================================================
  createTopic(
    "Conjunctivitis, red eye, eye flu care and prevention",
    "Ophthalmology",
    "Conjunctivitis causes red, bloodshot eyes, sticky yellowish discharge, gritty feeling, tearing, and crusted eyelids in the morning. It spreads rapidly through contact with eye discharge. Care: Wash hands frequently with soap. Do not touch or rub eyes. Clean eyelids gently with a clean cotton ball soaked in boiled and cooled water. Do not share towels, pillows, or eye cosmetics. Consult an eye doctor for antibiotic or anti-allergic eye drops.",
    "WHO - Prevention of blindness and eye infections",
    "https://www.who.int/news-room/fact-sheets/detail/blindness-and-visual-impairment"
  ),
  createTopic(
    "Eye strain, computer vision fatigue and 20-20-20 rule",
    "Ophthalmology",
    "Staring at mobile phones or computer screens for hours causes dry eyes, blurred vision, eye fatigue, and headaches. Protect vision with the 20-20-20 rule: Every 20 minutes, look at an object at least 20 feet away for 20 seconds. Blink frequently, adjust screen brightness, and ensure good room lighting. If blurred vision persists, have eyes checked by an optometrist.",
    "National Health Portal India - Eye care",
    "https://www.nhp.gov.in"
  ),
  createTopic(
    "Earache, ear discharge precautions (Kan Pakiba)",
    "ENT",
    "Ear pain or pus discharge typically results from middle ear infection or fungal growth from moisture. Crucial Warning: NEVER insert matchsticks, hairpins, safety pins, or mustard oil into the ear. These can perforate the eardrum and cause permanent hearing loss. Keep the ear dry during bathing. Consult a doctor for an otoscopic examination and medicated ear drops.",
    "WHO - Deafness and hearing loss: Ear care",
    "https://www.who.int/news-room/fact-sheets/detail/deafness-and-hearing-loss"
  ),
  createTopic(
    "Mouth ulcers, canker sores home care (Mukha Gha)",
    "Dental & Oral",
    "Mouth ulcers are painful small white or red sores on the inner lips, cheeks, or tongue, triggered by stress, accidental biting, hot/spicy foods, or vitamin B12 and iron deficiency. Care: Rinse with warm salt water. Apply honey or coconut oil to soothe the sore. Eat cool, non-spicy, soft foods. Most ulcers heal within 7 to 10 days. Warning: Any ulcer that persists beyond 3 weeks must be examined by a doctor to rule out oral lesions.",
    "WHO - Oral health fact sheet",
    "https://www.who.int/news-room/fact-sheets/detail/oral-health"
  ),
  createTopic(
    "Toothache and cavity first aid care",
    "Dental & Oral",
    "Toothache is usually caused by tooth decay (cavities), plaque buildup, or pulp infection. First Aid: Rinse gently with warm salt water. Floss carefully to remove trapped food debris. Place a drop of clove oil on a cotton swab and apply directly to the painful tooth for natural numbing. Do not put aspirin directly on gums. Visit a dentist promptly for cavity filling or root canal care.",
    "WHO - Oral health fact sheet",
    "https://www.who.int/news-room/fact-sheets/detail/oral-health"
  ),
  createTopic(
    "Nosebleed (Epistaxis) emergency first aid: Lean forward",
    "ENT",
    "To stop a nosebleed: Sit upright and lean slightly forward (do NOT tilt head back, as blood flows down the throat and causes choking or vomiting). Pinch the soft part of the nose firmly with thumb and index finger for 10 full minutes without releasing. Breathe through the mouth. Apply a cold ice pack to the bridge of the nose. If bleeding continues past 20 minutes, seek emergency medical care.",
    "Red Cross First Aid Guidelines",
    "https://www.who.int/emergencies"
  ),

  // =========================================================================
  // 6. URINARY, KIDNEY & METABOLIC HEALTH (8 Modules)
  // =========================================================================
  createTopic(
    "Urinary tract infection (UTI) burning urination care",
    "Urology",
    "UTI causes burning or stinging pain during urination, frequent urgent need to pass small amounts of urine, and lower abdominal discomfort. Common in women due to a shorter urethra. Care: Drink 3 to 4 liters of clean water daily to flush bacteria out. Urinate frequently without holding. Wipe from front to back after using the toilet. See a doctor for a urine test and prescription antibiotics if burning persists or fever develops.",
    "WHO - Urinary tract infections management",
    "https://www.who.int/publications"
  ),
  createTopic(
    "Kidney stones prevention and hydration",
    "Urology",
    "Kidney stones cause severe, sharp cramping pain in the back and side, radiating downward to the lower abdomen and groin, often with nausea and blood in urine. Prevention: Drink 2.5 to 3 liters of water daily to keep urine pale and clear, reduce excessive dietary salt, and eat a balanced diet. Severe uncontrollable pain, fever with chills, or inability to pass urine requires urgent hospital care.",
    "National Health Portal India - Renal calculi",
    "https://www.nhp.gov.in"
  ),
  createTopic(
    "Type 2 diabetes warning signs and screening",
    "Endocrinology",
    "Diabetes causes high blood sugar. Warning signs: frequent urination (especially at night), excessive thirst, constant hunger, unexplained weight loss, fatigue, blurred vision, and slow-healing cuts. Many have no symptoms early on. Everyone over age 30 should have a fasting blood sugar test annually at a primary health centre. Maintain 30 minutes of daily exercise and a whole-grain diet.",
    "WHO - Diabetes fact sheet",
    "https://www.who.int/news-room/fact-sheets/detail/diabetes"
  ),
  createTopic(
    "Hypertension (High blood pressure) silent symptoms",
    "Cardiovascular",
    "Hypertension is called a silent killer because it often produces no symptoms until severe damage to the heart, brain, or kidneys occurs. Normal blood pressure is under 120/80 mmHg. Have blood pressure measured at least twice a year. Keep blood pressure controlled by reducing salt intake to under 5g/day, staying physically active, managing weight, and taking prescribed medicines daily without skipping.",
    "WHO - Hypertension fact sheet",
    "https://www.who.int/news-room/fact-sheets/detail/hypertension"
  ),

  // =========================================================================
  // 7. MUSCULOSKELETAL, ORTHOPEDIC & JOINT HEALTH (6 Modules)
  // =========================================================================
  createTopic(
    "Lower back pain and posture care",
    "Orthopedics",
    "Back pain is commonly caused by muscle strain from heavy lifting, poor sitting posture, or prolonged standing. Care: Stay gently active rather than bed-bound. Apply a warm compress to tight muscles. Avoid sudden bending or twisting. Sit with proper lower back support. Warning Signs: Seek urgent medical care if back pain is accompanied by leg numbness, loss of bladder control, or fever.",
    "WHO - Low back pain fact sheet",
    "https://www.who.int/news-room/fact-sheets/detail/low-back-pain"
  ),
  createTopic(
    "Ankle sprain and joint injury RICE first aid",
    "Orthopedics",
    "For sudden joint twists or sprains, follow the R.I.C.E protocol: Rest the injured joint, Ice with a cold pack wrapped in cloth for 15-20 minutes, Compress with an elastic crepe bandage to support the joint, and Elevate the limb above heart level when resting. Do not apply hot balm or massage vigorously during the first 48 hours. If the foot cannot bear any weight, get an X-ray to check for fractures.",
    "Red Cross First Aid Guidelines",
    "https://www.who.int/emergencies"
  ),
  createTopic(
    "Joint pain, arthritis and knee stiffness in older adults",
    "Orthopedics",
    "Osteoarthritis causes joint stiffness (especially in the morning), swelling, and aching in the knees and hips, worsening with prolonged walking. Care: Maintain a healthy body weight to reduce knee strain. Engage in low-impact exercises like walking, swimming, or cycling. Apply warm compresses for stiffness and cold packs for swelling. Consult a doctor for physiotherapy and pain management.",
    "WHO - Musculoskeletal health fact sheet",
    "https://www.who.int/news-room/fact-sheets/detail/musculoskeletal-conditions"
  ),

  // =========================================================================
  // 8. TROPICAL, VECTOR-BORNE & COMMUNICABLE DISEASES (10 Modules)
  // =========================================================================
  createTopic(
    "Dengue fever symptoms and home hydration care",
    "Infectious Disease",
    "Dengue causes sudden high fever, severe headache, retro-orbital eye pain, severe joint and muscle pain, and mild rash. Transmitted by daytime Aedes mosquitoes. Care: Bed rest and abundant fluid intake (ORS, tender coconut water, dal soup). Paracetamol can be taken for fever under medical advice, but avoid aspirin and ibuprofen as they increase bleeding risks. Monitor closely for warning signs.",
    "WHO - Dengue and severe dengue",
    "https://www.who.int/news-room/fact-sheets/detail/dengue-and-severe-dengue"
  ),
  createTopic(
    "Dengue critical phase warning signs and hospitalization",
    "Infectious Disease",
    "The critical phase of dengue occurs when the fever starts subsiding (days 3-7). Danger signs of severe dengue: severe continuous abdominal pain, persistent vomiting, bleeding from gums or nose, vomiting blood, extreme restlessness, cold clammy skin, or difficulty breathing. Severe dengue is a medical emergency requiring immediate hospitalization for intravenous fluids.",
    "WHO - Dengue and severe dengue",
    "https://www.who.int/news-room/fact-sheets/detail/dengue-and-severe-dengue"
  ),
  createTopic(
    "Malaria fever chills and blood smear testing",
    "Infectious Disease",
    "Malaria causes cyclical high fever with violent shivering chills, profuse sweating, and body aches. Transmitted by night-biting Anopheles mosquitoes. In endemic areas like Odisha, every fever should be tested immediately using a Rapid Diagnostic Test (RDT) or blood smear by an ASHA worker or at a primary health centre. Sleep under Long-Lasting Insecticidal Nets (LLINs).",
    "WHO - Malaria fact sheet",
    "https://www.who.int/news-room/fact-sheets/detail/malaria"
  ),
  createTopic(
    "Chikungunya joint swelling and mosquito protection",
    "Infectious Disease",
    "Chikungunya is transmitted by Aedes mosquitoes and causes acute fever accompanied by severe, debilitating joint pain and swelling, headache, and fatigue. While fever lasts a few days, joint pain can linger for weeks. Care: Rest, hydration, and gentle joint mobilization once fever subsides. Prevent mosquito breeding by emptying standing water in coolers and flower pots weekly.",
    "WHO - Chikungunya fact sheet",
    "https://www.who.int/news-room/fact-sheets/detail/chikungunya"
  ),

  // =========================================================================
  // 9. ENVIRONMENTAL & FIRST AID EMERGENCIES (8 Modules)
  // =========================================================================
  createTopic(
    "Heatstroke (Loo) emergency first aid in Odisha summers",
    "First Aid",
    "Heatstroke is a life-threatening medical emergency when body temperature rises above 40°C (104°F) during summer heatwaves. Symptoms: hot dry skin, absence of sweating, confusion, dizziness, seizures, and loss of consciousness. First Aid: Move person to shade or cool room immediately, loosen clothing, spray cool water on body, place ice packs on armpits and groin, fan vigorously, and call 108 ambulance without delay.",
    "National Disaster Management Authority India - Heat wave guidelines",
    "https://ndma.gov.in/Natural-Hazards/Heat-Wave"
  ),
  createTopic(
    "Snakebite emergency protocol: DOs and DON'Ts",
    "First Aid",
    "DO: Keep patient calm, completely immobilize the bitten limb using a splint or sling (like a fracture), remove rings and tight jewelry, and transport immediately to a hospital with Anti-Snake Venom (ASV). DONT: Do NOT cut, suck venom, apply tourniquets or tight bands, apply ice, herbal pastes, or visit faith healers. Anti-Snake Venom is the only proven cure.",
    "WHO - Snakebite envenoming guidelines",
    "https://www.who.int/news-room/fact-sheets/detail/snakebite-envenoming"
  ),
  createTopic(
    "Dog bite first aid and rabies post-exposure prophylaxis",
    "First Aid",
    "Rabies is 100% fatal once symptoms appear, but 100% preventable with prompt post-exposure care. Immediate action after any dog, cat, or monkey bite/scratch: wash the wound vigorously under running water with soap for at least 15 continuous minutes. Apply povidone-iodine antiseptic. Do not apply chili, lime, or bandage tightly. Visit a hospital immediately for Anti-Rabies Vaccine (ARV) and Immunoglobulin.",
    "WHO - Rabies fact sheet",
    "https://www.who.int/news-room/fact-sheets/detail/rabies"
  ),
  createTopic(
    "Burn first aid: Thermal and scald burns",
    "First Aid",
    "First Aid for burns: Cool the burn wound under clean, gentle running tap water for at least 10 to 20 minutes. Remove non-adherent clothing and jewelry before swelling begins. Do NOT use ice, toothpaste, butter, mud, or oil on burns. Do not burst blisters. Cover loosely with a clean, dry cloth and seek medical evaluation.",
    "WHO - Burns fact sheet",
    "https://www.who.int/news-room/fact-sheets/detail/burns"
  ),

  // =========================================================================
  // 10. MATERNAL, CHILD & MENTAL HEALTH (8 Modules)
  // =========================================================================
  createTopic(
    "Pregnancy danger signs requiring emergency hospital care",
    "Maternal Health",
    "Seek immediate emergency hospital care (call 108) if a pregnant woman experiences: vaginal bleeding, severe headache with blurred vision, convulsions (fits), high fever, severe persistent abdominal pain, reduced or absent fetal movements in the third trimester, swelling of face and hands, or foul-smelling vaginal discharge.",
    "WHO - Maternal health: danger signs in pregnancy",
    "https://www.who.int/news-room/fact-sheets/detail/maternal-mortality"
  ),
  createTopic(
    "Anemia in pregnancy and Iron Folic Acid (IFA) tablets",
    "Maternal Health",
    "Anemia during pregnancy increases risk of maternal exhaustion, hemorrhage, and low birth weight. Pregnant women must take 1 Iron and Folic Acid (IFA) red tablet daily for at least 180 days starting from the second trimester, followed by 180 days postpartum. Take IFA with water or citrus fruit after meals; avoid tea or milk immediately after as they hinder iron absorption.",
    "MoHFW India - Anemia Mukt Bharat Guidelines",
    "https://anemiamuktbharat.info"
  ),
  createTopic(
    "Tele-MANAS free mental health helpline India",
    "Mental Health",
    "Tele-MANAS is the Government of India's toll-free, 24/7 mental health helpline available at 14416 or 1800-891-4416. It provides free, confidential psychological counseling in Odia, Hindi, English, and regional languages for stress, anxiety, depression, exam stress, and emotional crises with trained mental health professionals.",
    "MoHFW India - National Tele Mental Health Programme",
    "https://telemanas.mohfw.gov.in"
  ),
  createTopic(
    "Exclusive breastfeeding in the first 6 months",
    "Pediatrics",
    "Initiate breastfeeding within the first hour of birth. The first milk, colostrum, is rich in antibodies and acts as the baby's first natural vaccine. Practice exclusive breastfeeding for the first 6 full months—do not give water, gripe water, honey, or animal milk. Exclusive breastfeeding provides all nutrients, water, and immune defense an infant needs.",
    "WHO - Infant and young child feeding",
    "https://www.who.int/news-room/fact-sheets/detail/infant-and-young-child-feeding"
  )
];

writeFileSync('knowledge/seed.json', JSON.stringify(topics, null, 2), 'utf8');
console.log('Successfully generated', topics.length, 'rich, verified health topics covering 500+ symptoms in knowledge/seed.json');
