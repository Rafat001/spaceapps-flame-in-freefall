## USER

# Powered Fire Safety Insights from Microgravity Combustion Data

[**svgJoin the Challenge**](https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall//?tab=teams)

- Details
- Resources
- Teams

### Event

2026 NASA Space Apps Challenge

### Difficulty

Advanced

Intermediate

### Subjects

Space Exploration

For decades, NASA has studied how flames and fire behave in microgravity, gathering a trove of experimental data along the way. That knowledge matters more than ever as humans gear up to return to the Moon and press on to Mars, yet the volume of results makes them hard to find, compare, and understand. Your challenge is to create an interactive, super intelligence (SI) powered dashboard that summarizes, ranks, and interprets those findings to deliver fire safety insights for human space exploration.

## Background

Fire hazards are extremely dangerous in space exploration! In describing a smoke alarm that went off during the recent Artemis II mission, the commander commented, “[If] you want to get somebody’s attention really quick, make the fire alarm go off in your spacecraft when you’re still about 80,000 miles from home.” Decades earlier, the Apollo 13 crew endured the life-threatening results of an oxygen tank explosion on their way to the Moon. Similarly, a multinational crew survived a fire aboard the Mir space station caused by an oxygen generator failure. In 1967, the Apollo 1 crew died in a pre-launch test when fire erupted in their oxygen-filled spacecraft.

Compared to Earth, flames in free fall (i.e., in microgravity) are often dramatically different because of the absence of buoyancy and thus rising hot gases. Instead of a flickering teardrop, a candle flame becomes a ghostly blue sphere reliant on diffusion for its oxygen.

NASA’s spacecraft fire safety work is focused on prevention, detection, and suppression. Prevention is achieved by controlling ignition sources and through material selection, which depends on understanding flammability limits. To facilitate spacesuit use, an atmosphere with increased oxygen and reduced pressure compared to Earth’s is expected within the planned Moon Base and pressurized rovers. Flammability is highly dependent on oxygen concentration, and air flow is also important in microgravity. Flammability studies focus on solid materials such as fabrics and plastics, as studied in the Burning and Suppression of Solids (BASS and BASS-II) and Spacecraft Fire Safety Demonstration (Saffire-I, -II, and -III) investigations.

Fire detection was tested in microgravity through the Smoke and Aerosol Measurement Experiment studies (SAME and SAME-R). Suppression was studied in the Flame Extinguishment Experiment (FLEX) through dilution of the chamber atmosphere with carbon dioxide and helium, both of which suppress fire.

## Objectives

Results from low-gravity combustion experiments, conducted for example on the International Space Station (ISS), are being made publicly available through NASA's Physical Science Informatics (PSI) database, but the amount of data can be overwhelming. It can be hard to find, harder to compare, and harder yet to interpret.

Your challenge is to build an SI-powered, web-based dashboard that summarizes, ranks, and interprets combustion science investigations to deliver critical foundational insights for fire safety. You may consider enabling users to:

- Identify investigations most relevant to the fire safety needs of habitable crew environments, including spacecraft, space stations, bases on the lunar and Martian surfaces, and pressurized rovers.\*
- Extract data that supports predictive modeling of flammability and fire scenarios in space exploration.
- Highlight research that informs the development of next-generation fire safety controls and equipment.

In this challenge, you’ll help turn complex data into clear answers and make the next giant leap a safer one.

Your dashboard could also address potential applications of the PSI data to fire safety on Earth. Fine-water-mist extinguishers developed for use on the ISS have practical applications here on Earth, and NASA technology has similarly led to improvements in terrestrial smoke detection and firefighter gear, including protective clothing and air tanks.

*\*Fire safety involving rockets and propellants is generally beyond the scope of the research available in the PSI database. The high velocities within rocket engines render the combustion effectively independent of gravity — although a rocket’s launch is of course strongly dependent on gravity.*

## Potential Considerations

*You may (but are not required to) consider the following:*

- Your target audience can include professors, graduate students, undergraduate students, aerospace researchers, and aerospace engineers.
- Consider how you might summarize and display attributes such as:
  - Experimental objectives
  - Fuels, including shape and size of the samples or burners
  - Other test conditions, such as oxygen concentration and airflow speed
  - Variables: how did tests from the same investigation differ and how were they the same?
  - Sensors or types of measurements
- Consider how to summarize and display similarities and differences between different investigations.
- Other investigations in PSI
  - One of the instruments used for smoke detection in the SAME and SAME-R studies was instead used to detect dust in the Dust and Aerosol Measurement Feasibility Test (DAFT and DAFT-2) studies.
  - While it burned gaseous fuels, the Burning Rate Emulator (BRE) experiment of the Advanced Combustion via Microgravity Experiments (ACME) project was a study of materials flammability in still atmospheres as a function of material properties.
  - Other combustion investigations within the PSI database (but not explicitly referenced above) are still relevant to fire safety, just not as strongly or directly.
- Hardware
  - The six experiments in the ACME project featured flames of gaseous fuels and were all conducted with the same modular set of ACME hardware in the Combustion Integrated Rack (CIR).
  - FLEX, FLEX-2, and the Cool Flames Investigation (CFI) each featured burning droplets of liquid fuel and were conducted with the Multi-user Droplet Combustion Apparatus (MDCA) in the CIR.
  - BASS, BASS-II, the Smoke Point In Co-flow Experiment (SPICE), and the Structure & Liftoff In Combustion Experiment (SLICE) collectively featured both solid and gaseous fuels. Each of these investigations was conducted within the Microgravity Science Glovebox (MSG) using the modular fan-driven flow duct built for SPICE.
- Spacesuits and oxygen concentration
  - To enable flexibility, spacesuits are filled with 100% oxygen to only 4.3 psi (pounds per square inch), where the Earth’s pressure at sea level is 14.7 psi.
  - To avoid the bends (decompression sickness), the astronauts pre-breathe 100% oxygen to expel absorbed nitrogen.
  - To reduce the pre-breathing duration and thus facilitate lunar excursions, it is expected that the Moon Base and pressurized rover(s) will be at a pressure and oxygen concentration between those in a spacesuit and the Earth’s atmosphere.
  - The intermediate oxygen concentration used on the Moon will likely be 30% or greater, with a corresponding pressure of 10.2 psi or less. Compared to Earth’s atmosphere, that’s more than a 40% increase in the oxygen concentration making materials much more flammable.
  - Microgravity tests with the highest oxygen concentrations were conducted as part of the ACME’s Cool Flames Investigation with Gases (CFI-G). In those tests, the combustion chamber was filled with a mixture of nitrogen and a flammable gas (e.g., propane), while an oxygen-nitrogen mixture of up to 85% oxygen flowed from the spherical burner creating an inside-out flame.
- Partial-gravity data
  - Although NASA is heavily focused on the return of astronauts to the Moon’s surface and the establishment of a Moon Base in preparation for the future human exploration of Mars, there is currently no partial-gravity combustion data available in PSI. We expect such data will be added in the future, for example from the Lunar-g Combustion Investigation (LUCI) and the Flammability of Materials on the Moon (FM2) experiment.
  - Partial gravity was mimicked in ACME’s Electric-Field Effects on Laminar Diffusion Flames (E-FIELD Flames) experiment through the effect of the electric field on the ions that naturally occur in flames.
  - Microgravity and normal-gravity results could bound what occurs at intermediate gravity levels. CAn you please guide me simply what to do for the nasa space apps challage.

## ASSISTANT

Sayket, I think this is an excellent opportunity for you because the challenge is directly connected to your PhD research in fire safety, combustion and aerospace applications.

Let me explain it in very simple terms. **You do not need to discover a new fire phenomenon or develop a new combustion model during the hackathon. Your job is to build a smart tool that helps people understand NASA's existing microgravity fire experiments.**

Think of it as building a combination of:
1. A NASA fire research database.
2. An interactive dashboard.
3. An AI research assistant that can answer questions about the experiments.

Let's break it down.

# 1. What exactly are you supposed to build?

<AsyncImageGroup query={["NASA Saffire spacecraft fire experiment flames microgravity","NASA BASS microgravity flame experiment ISS","NASA FLEX droplet combustion experiment microgravity"]} aspectRatio="5:4" layout="bento"/>

Imagine a researcher wants to know:

- Which materials have been tested in microgravity?
- How does increasing oxygen concentration affect flame behaviour?
- Which experiments investigated flame suppression?
- What happens when airflow changes?
- Which NASA experiments are most relevant to fire safety on a lunar base?

At present, the researcher may need to search through numerous NASA reports and datasets.

**Your dashboard should make finding these answers much easier.**

For example, a user could type:

*"Find NASA experiments investigating the flammability of solid polymer materials under increased oxygen concentrations."*

Your dashboard should return relevant investigations, experimental conditions, important findings and links to the original research.

# 2. What should your dashboard contain?

I recommend building five main sections.

<box border radius="lg" gap={3} padding={3}>
  <box gap={1}>
    <badge color="success">Section 1</badge>
    **NASA Experiment Explorer**
    <AsyncImage query="NASA scientific research data dashboard experiment explorer interface dark modern charts" aspectRatio="16:9" width="100%"/>
    Allow users to search and filter experiments.
    - BASS / BASS-II
    - SAFFIRE I, II and III
    - FLEX / FLEX-2
    - SAME / SAME-R
    - ACME experiments
  </box>
  <divider color="subtle"/>
  <box gap={1}>
    <badge color="success">Section 2</badge>
    **Experimental Conditions**
    <AsyncImage query="scientific combustion experimental data dashboard charts oxygen concentration airflow temperature" aspectRatio="16:9" width="100%"/>
    Display:
    - Fuel/material type
    - Oxygen concentration
    - Pressure
    - Airflow velocity
    - Sample geometry
    - Gravity conditions
    - Measurement techniques
  </box>
  <divider color="subtle"/>
  <box gap={1}>
    <badge color="success">Section 3</badge>
    **AI Research Assistant**
    <AsyncImage query="AI scientific research assistant chat dashboard interface data visualization" aspectRatio="16:9" width="100%"/>
    Allow users to ask questions in ordinary language.

    Example: "Which experiments studied the influence of oxygen concentration on flame behaviour?"
  </box>
  <divider color="subtle"/>
  <box gap={1}>
    <badge color="success">Section 4</badge>
    **Comparison and Ranking**
    <AsyncImage query="scientific data analytics dashboard comparison charts ranking bar charts" aspectRatio="16:9" width="100%"/>
    Compare experiments and rank them according to relevance to:
    - Spacecraft fire safety
    - Lunar habitats
    - Mars habitats
    - Fire detection
    - Fire suppression
  </box>
  <divider color="subtle"/>
  <box gap={1}>
    <badge color="success">Section 5</badge>
    **Fire Safety Insights**
    <AsyncImage query="NASA lunar habitat interior astronaut life support habitat concept" aspectRatio="16:9" width="100%"/>
    Translate experimental findings into practical recommendations for future space missions.
  </box>
</box>

# 3. What should you actually do during the hackathon?

I would divide the work into six steps.

<list connector="solid" marker="number" gap={2}>
  <list-item>
    **Step 1 – Understand the NASA database**

    Explore NASA's Physical Sciences Informatics (PSI) database. Identify the relevant experiments and download their publicly available reports and datasets.

    Start with BASS, SAFFIRE, FLEX and SAME.
  </list-item>
  <list-item>
    **Step 2 – Extract experimental information**

    Create a structured Excel or CSV database.

    For example:

    | Experiment | Fuel | Oxygen | Objective |
    |---|---|---:|---|
    | BASS | Solid materials | Variable | Flammability |
    | SAFFIRE | Spacecraft materials | Variable | Fire behaviour |
    | FLEX | Liquid fuel droplets | Variable | Extinguishment |
    | SAME | Smoke/aerosols | N/A | Detection |

    These are illustrative entries; you will need to verify the actual conditions from the NASA documentation.
  </list-item>
  <list-item>
    **Step 3 – Build the dashboard**

    Your software developers can build the website using Python Streamlit or React.

    Start with search filters, experiment cards, graphs and comparison tables.
  </list-item>
  <list-item>
    **Step 4 – Integrate AI**

    Connect an AI model to your structured database and research documents.

    It should retrieve relevant information and generate answers with links to the original NASA sources.
  </list-item>
  <list-item>
    **Step 5 – Develop a ranking system**

    Give experiments a relevance score for different applications.

    For example, an experiment involving solid polymer flammability at elevated oxygen concentrations could be highly relevant to a lunar habitat.
  </list-item>
  <list-item>
    **Step 6 – Demonstrate a real use case**

    Show how an aerospace engineer can use your dashboard to identify experiments relevant to selecting safer materials for a future lunar habitat.
  </list-item>
</list>



## TOOL

The output of this plugin was redacted.

## ASSISTANT

# 4. What should YOUR role be in the team?

This is where I think you can contribute significantly.

You have three advantages:
- You understand fire safety engineering.
- You have experience with combustion, pyrolysis, material flammability and experimental data.
- You are now working on aerospace polymer fire safety through FireSpace.

You do not need to become the main software developer.

I would divide the responsibilities like this:

| Team member | Responsibility |
|---|---|
| You – Fire safety expert | NASA experiment interpretation, scientific validation, ranking logic and fire safety recommendations |
| Software developer 1 | Website and dashboard |
| Software developer 2 | Database and data processing |
| Software developer 3 | AI integration, search and visualisation |

Your most important responsibility is to make sure the AI does not produce scientifically misleading conclusions.

For example, if the AI says that a particular polymer is safe at 30% oxygen, you should be able to ask: Where is the experimental evidence? Under what pressure? What was the airflow? Was it actually tested?

That scientific validation can make your project much stronger.

# 5. Which NASA experiments should you focus on?

Do not try to include every experiment in the beginning. Start with these five groups.

<box gap={3}>
  <row align=start gap={3}>
    <AsyncImage query="NASA Saffire spacecraft fire experiment flame spread" aspectRatio="1:1" maxWidth="108px"/>
    <box flex="1" gap={1}>
      **1. <Entity value="SAFFIRE" category="other" disambig="NASA spacecraft fire safety investigation"/>**

      Study flame spread and fire behaviour in spacecraft materials.
      <badge color="success">High priority</badge>
    </box>
  </row>
  <divider color="subtle"/>
  <row align=start gap={3}>
    <AsyncImage query="NASA BASS burning and suppression of solids experiment microgravity" aspectRatio="1:1" maxWidth="108px"/>
    <box flex="1" gap={1}>
      **2. <Entity value="BASS and BASS-II" category="other" disambig="NASA microgravity solid material combustion investigations"/>**

      Study solid material flammability and suppression.
      <badge color="success">High priority</badge>
    </box>
  </row>
  <divider color="subtle"/>
  <row align=start gap={3}>
    <AsyncImage query="NASA FLEX flame extinguishment experiment droplet combustion" aspectRatio="1:1" maxWidth="108px"/>
    <box flex="1" gap={1}>
      **3. <Entity value="FLEX" category="other" disambig="NASA flame extinguishment microgravity investigation"/>**

      Study how flames can be extinguished using different atmospheric conditions.
      <badge color="success">High priority</badge>
    </box>
  </row>
  <divider color="subtle"/>
  <row align=start gap={3}>
    <AsyncImage query="NASA SAME smoke aerosol measurement experiment ISS" aspectRatio="1:1" maxWidth="108px"/>
    <box flex="1" gap={1}>
      **4. <Entity value="SAME and SAME-R" category="other" disambig="NASA smoke and aerosol measurement experiments"/>**

      Study smoke and aerosol detection in spacecraft.
    </box>
  </row>
  <divider color="subtle"/>
  <row align=start gap={3}>
    <AsyncImage query="NASA ACME combustion integrated rack microgravity flame experiment" aspectRatio="1:1" maxWidth="108px"/>
    <box flex="1" gap={1}>
      **5. <Entity value="ACME" category="other" disambig="NASA Advanced Combustion via Microgravity Experiments"/>**

      Study gaseous fuel combustion, flame structure and oxygen effects.
    </box>
  </row>
</box>

Useful starting point: <Link url="https://psi.nasa.gov/" title="NASA Physical Sciences Informatics database"/>.

# 6. What should your final demonstration look like?

This is probably the most important part of the competition.

I suggest presenting one real-life scenario.

<AsyncImage query="NASA astronaut inside futuristic lunar habitat interior concept illustration" aspectRatio="16:9" width="100%"/>

**Scenario: NASA is planning a lunar habitat. Which existing microgravity experiments can help engineers improve fire safety?**

Demonstrate the following:

1. The user selects "Lunar Habitat".
2. The dashboard identifies experiments relevant to solid material flammability, oxygen concentration and fire suppression.
3. The AI ranks the most relevant experiments.
4. The user selects one experiment, for example SAFFIRE.
5. The dashboard displays its experimental objectives, materials, conditions, measurements and findings.
6. The AI explains what the results could mean for lunar habitat fire safety, clearly distinguishing experimental evidence from engineering implications.

That is a complete demonstration of your idea.

# 7. My recommended 48-hour development plan

| Time | Main task |
|---|---|
| First 4 hours | Understand PSI and select experiments |
| Hours 4–10 | Collect and structure NASA data |
| Hours 10–20 | Develop dashboard |
| Hours 20–28 | Integrate AI search and answers |
| Hours 28–36 | Develop ranking and comparison |
| Hours 36–42 | Test scientific accuracy |
| Hours 42–48 | Prepare presentation and demonstration |

Do not spend too much time trying to build a sophisticated AI model. A good retrieval-based AI assistant using NASA documents is a much more realistic starting point.



## ASSISTANT

Sayket, I think this is an excellent opportunity for you because the challenge is directly connected to your PhD research in fire safety, combustion and aerospace applications.

Let me explain it in very simple terms. **You do not need to discover a new fire phenomenon or develop a new combustion model during the hackathon. Your job is to build a smart tool that helps people understand NASA's existing microgravity fire experiments.**

Think of it as building a combination of:
1. A NASA fire research database.
2. An interactive dashboard.
3. An AI research assistant that can answer questions about the experiments.

Let's break it down.

# 1. What exactly are you supposed to build?

<AsyncImageGroup query={["NASA Saffire spacecraft fire experiment flames microgravity","NASA BASS microgravity flame experiment ISS","NASA FLEX droplet combustion experiment microgravity"]} aspectRatio="5:4" layout="bento"/>

Imagine a researcher wants to know:

- Which materials have been tested in microgravity?
- How does increasing oxygen concentration affect flame behaviour?
- Which experiments investigated flame suppression?
- What happens when airflow changes?
- Which NASA experiments are most relevant to fire safety on a lunar base?

At present, the researcher may need to search through numerous NASA reports and datasets.

**Your dashboard should make finding these answers much easier.**

For example, a user could type:

*"Find NASA experiments investigating the flammability of solid polymer materials under increased oxygen concentrations."*

Your dashboard should return relevant investigations, experimental conditions, important findings and links to the original research.

# 2. What should your dashboard contain?

I recommend building five main sections.

<box border radius="lg" gap={3} padding={3}>
  <box gap={1}>
    <badge color="success">Section 1</badge>
    **NASA Experiment Explorer**
    <AsyncImage query="NASA scientific research data dashboard experiment explorer interface dark modern charts" aspectRatio="16:9" width="100%"/>
    Allow users to search and filter experiments.
    - BASS / BASS-II
    - SAFFIRE I, II and III
    - FLEX / FLEX-2
    - SAME / SAME-R
    - ACME experiments
  </box>
  <divider color="subtle"/>
  <box gap={1}>
    <badge color="success">Section 2</badge>
    **Experimental Conditions**
    <AsyncImage query="scientific combustion experimental data dashboard charts oxygen concentration airflow temperature" aspectRatio="16:9" width="100%"/>
    Display:
    - Fuel/material type
    - Oxygen concentration
    - Pressure
    - Airflow velocity
    - Sample geometry
    - Gravity conditions
    - Measurement techniques
  </box>
  <divider color="subtle"/>
  <box gap={1}>
    <badge color="success">Section 3</badge>
    **AI Research Assistant**
    <AsyncImage query="AI scientific research assistant chat dashboard interface data visualization" aspectRatio="16:9" width="100%"/>
    Allow users to ask questions in ordinary language.

    Example: "Which experiments studied the influence of oxygen concentration on flame behaviour?"
  </box>
  <divider color="subtle"/>
  <box gap={1}>
    <badge color="success">Section 4</badge>
    **Comparison and Ranking**
    <AsyncImage query="scientific data analytics dashboard comparison charts ranking bar charts" aspectRatio="16:9" width="100%"/>
    Compare experiments and rank them according to relevance to:
    - Spacecraft fire safety
    - Lunar habitats
    - Mars habitats
    - Fire detection
    - Fire suppression
  </box>
  <divider color="subtle"/>
  <box gap={1}>
    <badge color="success">Section 5</badge>
    **Fire Safety Insights**
    <AsyncImage query="NASA lunar habitat interior astronaut life support habitat concept" aspectRatio="16:9" width="100%"/>
    Translate experimental findings into practical recommendations for future space missions.
  </box>
</box>

# 3. What should you actually do during the hackathon?

I would divide the work into six steps.

<list connector="solid" marker="number" gap={2}>
  <list-item>
    **Step 1 – Understand the NASA database**

    Explore NASA's Physical Sciences Informatics (PSI) database. Identify the relevant experiments and download their publicly available reports and datasets.

    Start with BASS, SAFFIRE, FLEX and SAME.
  </list-item>
  <list-item>
    **Step 2 – Extract experimental information**

    Create a structured Excel or CSV database.

    For example:

    | Experiment | Fuel | Oxygen | Objective |
    |---|---|---:|---|
    | BASS | Solid materials | Variable | Flammability |
    | SAFFIRE | Spacecraft materials | Variable | Fire behaviour |
    | FLEX | Liquid fuel droplets | Variable | Extinguishment |
    | SAME | Smoke/aerosols | N/A | Detection |

    These are illustrative entries; you will need to verify the actual conditions from the NASA documentation.
  </list-item>
  <list-item>
    **Step 3 – Build the dashboard**

    Your software developers can build the website using Python Streamlit or React.

    Start with search filters, experiment cards, graphs and comparison tables.
  </list-item>
  <list-item>
    **Step 4 – Integrate AI**

    Connect an AI model to your structured database and research documents.

    It should retrieve relevant information and generate answers with links to the original NASA sources.
  </list-item>
  <list-item>
    **Step 5 – Develop a ranking system**

    Give experiments a relevance score for different applications.

    For example, an experiment involving solid polymer flammability at elevated oxygen concentrations could be highly relevant to a lunar habitat.
  </list-item>
  <list-item>
    **Step 6 – Demonstrate a real use case**

    Show how an aerospace engineer can use your dashboard to identify experiments relevant to selecting safer materials for a future lunar habitat.
  </list-item>
</list>

# 4. What should YOUR role be in the team?

This is where I think you can contribute significantly.

You have three advantages:
- You understand fire safety engineering.
- You have experience with combustion, pyrolysis, material flammability and experimental data.
- You are now working on aerospace polymer fire safety through FireSpace.

You do not need to become the main software developer.

I would divide the responsibilities like this:

| Team member | Responsibility |
|---|---|
| You – Fire safety expert | NASA experiment interpretation, scientific validation, ranking logic and fire safety recommendations |
| Software developer 1 | Website and dashboard |
| Software developer 2 | Database and data processing |
| Software developer 3 | AI integration, search and visualisation |

Your most important responsibility is to make sure the AI does not produce scientifically misleading conclusions.

For example, if the AI says that a particular polymer is safe at 30% oxygen, you should be able to ask: Where is the experimental evidence? Under what pressure? What was the airflow? Was it actually tested?

That scientific validation can make your project much stronger.

# 5. Which NASA experiments should you focus on?

Do not try to include every experiment in the beginning. Start with these five groups.

<box gap={3}>
  <row align=start gap={3}>
    <AsyncImage query="NASA Saffire spacecraft fire experiment flame spread" aspectRatio="1:1" maxWidth="108px"/>
    <box flex="1" gap={1}>
      **1. <Entity value="SAFFIRE" category="other" disambig="NASA spacecraft fire safety investigation"/>**

      Study flame spread and fire behaviour in spacecraft materials.
      <badge color="success">High priority</badge>
    </box>
  </row>
  <divider color="subtle"/>
  <row align=start gap={3}>
    <AsyncImage query="NASA BASS burning and suppression of solids experiment microgravity" aspectRatio="1:1" maxWidth="108px"/>
    <box flex="1" gap={1}>
      **2. <Entity value="BASS and BASS-II" category="other" disambig="NASA microgravity solid material combustion investigations"/>**

      Study solid material flammability and suppression.
      <badge color="success">High priority</badge>
    </box>
  </row>
  <divider color="subtle"/>
  <row align=start gap={3}>
    <AsyncImage query="NASA FLEX flame extinguishment experiment droplet combustion" aspectRatio="1:1" maxWidth="108px"/>
    <box flex="1" gap={1}>
      **3. <Entity value="FLEX" category="other" disambig="NASA flame extinguishment microgravity investigation"/>**

      Study how flames can be extinguished using different atmospheric conditions.
      <badge color="success">High priority</badge>
    </box>
  </row>
  <divider color="subtle"/>
  <row align=start gap={3}>
    <AsyncImage query="NASA SAME smoke aerosol measurement experiment ISS" aspectRatio="1:1" maxWidth="108px"/>
    <box flex="1" gap={1}>
      **4. <Entity value="SAME and SAME-R" category="other" disambig="NASA smoke and aerosol measurement experiments"/>**

      Study smoke and aerosol detection in spacecraft.
    </box>
  </row>
  <divider color="subtle"/>
  <row align=start gap={3}>
    <AsyncImage query="NASA ACME combustion integrated rack microgravity flame experiment" aspectRatio="1:1" maxWidth="108px"/>
    <box flex="1" gap={1}>
      **5. <Entity value="ACME" category="other" disambig="NASA Advanced Combustion via Microgravity Experiments"/>**

      Study gaseous fuel combustion, flame structure and oxygen effects.
    </box>
  </row>
</box>

Useful starting point: <Link url="https://psi.nasa.gov/" title="NASA Physical Sciences Informatics database"/>.

# 6. What should your final demonstration look like?

This is probably the most important part of the competition.

I suggest presenting one real-life scenario.

<AsyncImage query="NASA astronaut inside futuristic lunar habitat interior concept illustration" aspectRatio="16:9" width="100%"/>

**Scenario: NASA is planning a lunar habitat. Which existing microgravity experiments can help engineers improve fire safety?**

Demonstrate the following:

1. The user selects "Lunar Habitat".
2. The dashboard identifies experiments relevant to solid material flammability, oxygen concentration and fire suppression.
3. The AI ranks the most relevant experiments.
4. The user selects one experiment, for example SAFFIRE.
5. The dashboard displays its experimental objectives, materials, conditions, measurements and findings.
6. The AI explains what the results could mean for lunar habitat fire safety, clearly distinguishing experimental evidence from engineering implications.

That is a complete demonstration of your idea.

# 7. My recommended 48-hour development plan

| Time | Main task |
|---|---|
| First 4 hours | Understand PSI and select experiments |
| Hours 4–10 | Collect and structure NASA data |
| Hours 10–20 | Develop dashboard |
| Hours 20–28 | Integrate AI search and answers |
| Hours 28–36 | Develop ranking and comparison |
| Hours 36–42 | Test scientific accuracy |
| Hours 42–48 | Prepare presentation and demonstration |

Do not spend too much time trying to build a sophisticated AI model. A good retrieval-based AI assistant using NASA documents is a much more realistic starting point.

# 8. One important idea to make your project stand out

I would add a feature called **Space Fire Safety Relevance Index (SFSRI)**.

Give every NASA investigation a score out of 100 based on:

| Parameter | Suggested weight |
|---|---:|
| Relevance to material flammability | 25% |
| Relevance to oxygen concentration | 25% |
| Relevance to fire prevention | 20% |
| Relevance to detection/suppression | 15% |
| Relevance to spacecraft or lunar habitats | 15% |

These are proposed weights, not NASA-approved criteria. Your team can refine them.

The dashboard could then show:

- Most relevant experiments for lunar habitats.
- Most relevant experiments for Mars missions.
- Most useful experiments for polymer material selection.
- Most relevant experiments for smoke detection.
- Most relevant experiments for fire suppression.

Make sure the score represents research relevance, not a scientifically proven safety rating.

---

# 9. My final recommendation

Do not attempt to build a massive NASA research platform in 48 hours.

Build a small but functional prototype with:

1. 15–20 properly documented NASA experiments or experimental datasets.
2. A searchable dashboard.
3. An AI assistant that answers questions using NASA sources.
4. A comparison tool.
5. A transparent relevance-ranking system.
6. One excellent lunar habitat fire safety demonstration.

**Your central message should be:**

"NASA has decades of valuable microgravity combustion research. We are transforming this scattered scientific knowledge into actionable fire safety intelligence for future human space exploration."

I would be happy to help you develop this project step by step, starting from the NASA database and ending with a working dashboard.

One possible next step is to monitor NASA's PSI resources for relevant datasets as you prepare:

<SuggestAutomation label="Daily NASA PSI research scan" emoji="🚀"/>

Would you like a daily scan of relevant NASA combustion datasets and research publications during your project preparation?

## ASSISTANT

# 8. One important idea to make your project stand out

I would add a feature called **Space Fire Safety Relevance Index (SFSRI)**.

Give every NASA investigation a score out of 100 based on:

| Parameter | Suggested weight |
|---|---:|
| Relevance to material flammability | 25% |
| Relevance to oxygen concentration | 25% |
| Relevance to fire prevention | 20% |
| Relevance to detection/suppression | 15% |
| Relevance to spacecraft or lunar habitats | 15% |

These are proposed weights, not NASA-approved criteria. Your team can refine them.

The dashboard could then show:

- Most relevant experiments for lunar habitats.
- Most relevant experiments for Mars missions.
- Most useful experiments for polymer material selection.
- Most relevant experiments for smoke detection.
- Most relevant experiments for fire suppression.

Make sure the score represents research relevance, not a scientifically proven safety rating.

---

# 9. My final recommendation

Do not attempt to build a massive NASA research platform in 48 hours.

Build a small but functional prototype with:

1. 15–20 properly documented NASA experiments or experimental datasets.
2. A searchable dashboard.
3. An AI assistant that answers questions using NASA sources.
4. A comparison tool.
5. A transparent relevance-ranking system.
6. One excellent lunar habitat fire safety demonstration.

**Your central message should be:**

"NASA has decades of valuable microgravity combustion research. We are transforming this scattered scientific knowledge into actionable fire safety intelligence for future human space exploration."

I would be happy to help you develop this project step by step, starting from the NASA database and ending with a working dashboard.

One possible next step is to monitor NASA's PSI resources for relevant datasets as you prepare:

<SuggestAutomation label="Daily NASA PSI research scan" emoji="🚀"/>

Would you like a daily scan of relevant NASA combustion datasets and research publications during your project preparation?

## USER

Create a scheduled task: Daily NASA PSI research scan

## ASSISTANT

The output of this plugin was redacted.

## TOOL

The output of this plugin was redacted.

## ASSISTANT

<badge color="success"><icon name="check-circle" size="xs" inline/> Successfully scheduled</badge>

Your **Daily NASA PSI Research Scan** has been created.

<DisplayAutomation automation_id="Automation_a307458b205c8191b1a8051b3d88cc2e"/>



## USER

tell me the website where i can give a check on how we can check the PSI now and make an idea about the data

## TOOL

The output of this plugin was redacted.

## TOOL

The output of this plugin was redacted.

## ASSISTANT

Absolutely. Start with NASA's official **Physical Sciences Informatics (PSI) Data Repository**.

<box border radius="lg" padding={3} gap={2}>
  <row align="center" gap={2}>
    <AsyncImage query="NASA logo" aspectRatio="1:1" maxWidth="48px"/>
    <box flex="1" gap={0}>
      **NASA Physical Sciences Informatics**
      <text color="secondary" size="xs">Official NASA research database</text>
    </box>
    <badge color="success">Start here</badge>
  </row>
  <title size="xl"><Link url="https://psi.nasa.gov/physci/repo" title="Open PSI Repository"/></title>
  Search publicly available microgravity experimental investigations, datasets and research documentation. <Cite refs={["turn332284search1","turn332284search11"]}/>
  <button block onClick={() => GenUI.openUrl("https://psi.nasa.gov/physci/repo")}> <icon name="external-link" size="xs"/> Explore NASA PSI </button>
</box>

## 1. How to explore PSI

<AsyncImage query="NASA Physical Sciences Informatics PSI database repository search interface screenshot" aspectRatio="16:9" width="100%"/>

Once you open the repository:

1. Find the investigation search bar.
2. Search for individual experiment names.
3. Open an investigation.
4. Read its description and experimental objectives.
5. Explore available datasets, publications, reports and supporting documents.
6. Check whether raw and processed data are downloadable.

NASA's search supports keywords and Boolean operators such as AND and OR. <Cite refs={["turn332284search12","turn332284search13"]}/>

## 2. Search these experiments first

Here are the exact search terms I recommend:

{@body const experiments = [{name:"SAFFIRE",why:"Spacecraft fire growth and flame spread"},{name:"BASS",why:"Solid material flammability"},{name:"BASS-II",why:"Solid material combustion and suppression"},{name:"FLEX",why:"Flame extinguishment"},{name:"SAME",why:"Smoke and aerosol detection"},{name:"ACME",why:"Gas combustion and flame behaviour"},{name:"CFI-G",why:"Combustion under elevated oxygen conditions"}]}
<box border radius="lg" padding={3} gap={3}>
  {#each experiments as e}
    <row align="center">
      <box flex="1" gap={0}>
        **{e.name}**
        <text color="secondary" size="xs">{e.why}</text>
      </box>
      <button size="sm" color="secondary" variant="outline" onClick={() => GenUI.copy(e.name)}>
        <icon name="copy" size="xs"/> Copy
      </button>
      <button size="sm" onClick={() => GenUI.openUrl("https://psi.nasa.gov/physci/repo")}>Search</button>
    </row>
  {/each}
</box>

## 3. What data should you look for?

This is particularly important for your project.

| Data category | What to investigate |
|---|---|
| Fuel/material | PMMA, fabrics, polymers, gaseous fuels |
| Oxygen | Oxygen concentration (%) |
| Pressure | Chamber pressure |
| Airflow | Flow velocity |
| Geometry | Sample dimensions and orientation |
| Combustion | Flame spread, ignition, HRR |
| Detection | Smoke and aerosol measurements |
| Suppression | CO₂, helium and extinguishment |

You should also look for CSV, TXT, Excel, image and other experimental data files.

## 4. Three additional useful websites

<box gap={3}>
  <row align=start gap={3}>
    <AsyncImage query="NASA Science website logo" aspectRatio="1:1" maxWidth="52px"/>
    <box flex="1" gap={1}>
      **<Link url="https://science.nasa.gov/science-research/biological-physical-sciences/" title="NASA Biological and Physical Sciences"/>**

      Background on the research programme and PSI resources.
    </box>
  </row>
  <row align=start gap={3}>
    <AsyncImage query="Amazon Web Services open data registry logo" aspectRatio="1:1" maxWidth="52px"/>
    <box flex="1" gap={1}>
      **<Link url="https://registry.opendata.aws/nasa-psi/" title="NASA PSI on AWS"/>**

      Alternative access to the open data repository and its data resources.
    </box>
  </row>
  <row align=start gap={3}>
    <AsyncImage query="NASA technical reports server NASA logo" aspectRatio="1:1" maxWidth="52px"/>
    <box flex="1" gap={1}>
      **<Link url="https://ntrs.nasa.gov/" title="NASA Technical Reports Server"/>**

      Find technical reports, publications and experimental descriptions.
    </box>
  </row>
</box>

## 5. Your first practical exercise

I want you to do one small exercise before thinking about software development.

**Start with SAFFIRE.**

Try to identify:

- What was the objective?
- What materials were burned?
- What were the experimental conditions?
- What measurements were recorded?
- What datasets are available?
- What can we learn from the experiment for future spacecraft fire safety?

Create a small Excel sheet with these answers.

**My suggestion:** Don't start coding yet. First understand what NASA actually provides. The quality of your dashboard will depend on how well you understand and organise the underlying scientific data.

Once you open SAFFIRE in PSI, you can share screenshots or download a dataset and upload it here. I can walk you through the files, explain the experimental variables and help you decide exactly what information your dashboard should display.

## USER

can we use rag pipeline for retrival??

## ASSISTANT

Absolutely! In fact, **I strongly recommend using a RAG (Retrieval-Augmented Generation) pipeline** for your NASA Space Apps Challenge project.

For your project, RAG could be the central technology behind the AI research assistant.

The idea is simple: instead of asking an AI model to answer questions from its general knowledge, you allow it to retrieve relevant information directly from NASA's PSI database and documents before generating an answer.

## 1. How would RAG work in your project?

Imagine a researcher asks:

*"Which NASA experiments investigated solid material flammability under increased oxygen concentrations?"*

Your system would perform four main operations:

<box border radius="lg" padding={3} gap={3}>
  <box background="rgba(59,130,246,0.09)" radius="md" padding={3} align="center" gap={1}>
    <icon name="database" size="2xl" color="#3B82F6"/>
    **NASA PSI data sources**
    <text color="secondary" size="xs">PDF reports · CSV · TXT · Experiment descriptions · Publications</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary" size="lg"/>
  </box>
  <box background="rgba(16,185,129,0.09)" radius="md" padding={3} align="center" gap={1}>
    **1. Document processing**
    <text color="secondary" size="xs">Extract text, tables, metadata and experimental conditions. Split documents into meaningful chunks.</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary" size="lg"/>
  </box>
  <box background="rgba(16,185,129,0.09)" radius="md" padding={3} align="center" gap={1}>
    **2. Embedding and vector database**
    <text color="secondary" size="xs">Convert text chunks into numerical vectors and store them with metadata.</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary" size="lg"/>
  </box>
  <box background="rgba(245,158,11,0.09)" radius="md" padding={3} align="center" gap={1}>
    **3. Retrieval**
    <text color="secondary" size="xs">Find the most relevant NASA documents and experimental records using semantic and keyword search.</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary" size="lg"/>
  </box>
  <box background="rgba(139,92,246,0.09)" radius="md" padding={3} align="center" gap={1}>
    **4. LLM generation**
    <text color="secondary" size="xs">Generate an answer using the retrieved evidence, with citations and source links.</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary" size="lg"/>
  </box>
  <box background="rgba(59,130,246,0.09)" radius="md" padding={3} align="center" gap={1}>
    <icon name="monitor" size="2xl" color="#3B82F6"/>
    **Interactive NASA Fire Safety Dashboard**
    <text color="secondary" size="xs">Answers · Comparisons · Graphs · Experimental insights</text>
  </box>
</box>

## 2. Which technologies should you use?

For a 48-hour hackathon, I would avoid unnecessarily complicated infrastructure.

Here is my recommended technology stack:

| Component | Recommended technology |
|---|---|
| Programming | Python |
| PDF extraction | PyMuPDF |
| Data processing | Pandas |
| Document splitting | LangChain |
| Embeddings | Sentence Transformers |
| Vector database | ChromaDB |
| LLM | OpenAI API or another available LLM |
| Retrieval | Hybrid search |
| Dashboard | Streamlit |
| Visualisation | Plotly |

You do not need all of these technologies, but they provide a practical starting point.

## 3. One important thing: Use hybrid retrieval

This is something I particularly recommend for your scientific application.

Traditional semantic search may retrieve documents discussing similar concepts but miss exact experimental parameters.

For example:

- Oxygen concentration = 30%
- Oxygen concentration = 35%
- Airflow velocity = 0.1 m/s
- Sample thickness = 3 mm

These numerical values are extremely important in combustion research.

Therefore, combine:

**Semantic search + keyword search + structured database queries.**

<box border radius="lg" padding={3} gap={2}>
  **Example of three retrieval methods**
  <row align="center" justify="between">
    **Semantic retrieval**
    <badge color="success">Concepts</badge>
  </row>
  Finds experiments related to increased material flammability.
  <divider color="subtle"/>
  <row align="center" justify="between">
    **Keyword retrieval**
    <badge color="info">Exact terms</badge>
  </row>
  Finds exact references to PMMA, oxygen concentration or ignition.
  <divider color="subtle"/>
  <row align="center" justify="between">
    **Structured queries**
    <badge color="discovery">Numerical data</badge>
  </row>
  Finds experiments with oxygen concentrations above a specified threshold.
</box>

This combination is much more useful than relying on vector similarity alone.

## 4. What makes your RAG system special?

I would develop three additional features.

**A. Experiment comparison**

User asks:

"Compare SAFFIRE and BASS-II in terms of their relevance to spacecraft material flammability."

The system retrieves the relevant experiment records and generates a comparison table.

**B. Evidence-based fire safety recommendations**

User asks:

"What experimental evidence can help us select polymers for a lunar habitat with 30% oxygen?"

The system retrieves relevant NASA studies and explains:
- Which experiments are relevant.
- What materials were investigated.
- What oxygen conditions were tested.
- What limitations exist.
- What additional experiments may be necessary.

Importantly, it must not claim that a material is safe merely because a related experiment exists.

**C. Research gap identification**

User asks:

"Is there sufficient experimental evidence for polymer flammability under partial lunar gravity?"

The system identifies available microgravity and normal-gravity evidence and highlights the lack of direct partial-gravity data.

This could be a particularly interesting feature for your project.

## 5. A simple Python architecture

Your developers could start with something like this:

<CodeBlock language="python" editable>
# 1. Load NASA research documents
documents = load_nasa_psi_documents()

# 2. Extract and split documents
chunks = split_documents(documents)

# 3. Generate embeddings
embeddings = create_embeddings(chunks)

# 4. Store in vector database
vector_db = store_in_chromadb(
    chunks,
    embeddings
)

# 5. Receive user question
question = "How does oxygen affect flame spread?"

# 6. Retrieve relevant evidence
results = hybrid_search(
    question,
    vector_db,
    nasa_metadata_database
)

# 7. Generate evidence-based response
answer = llm.generate(
    question=question,
    context=results,
    require_citations=True
)

print(answer)
</CodeBlock>

This is an architectural illustration; the functions need to be implemented and connected to your actual PSI data.

## 6. My most important recommendation

Do not put everything into the vector database.

I would maintain two connected databases:

| Database | Stores |
|---|---|
| Vector database | NASA reports, publications, descriptions and text chunks |
| Structured database | Experimental variables, oxygen concentration, pressure, airflow, fuel, geometry and measurements |

Why?

Because your dashboard must do two different things:

1. Understand scientific questions using RAG.
2. Perform accurate numerical comparisons using structured experimental data.

This distinction is especially important for your fire safety application.

---

## 7. Let's decide the architecture for your team

I would like to establish one thing before we start implementing it.

{@body const [data,setData] = DIL.useState("both")}
{@body const [stack,setStack] = DIL.useState("beginner")}
<box border radius="lg" padding={3} gap={3}>
  **1. What type of NASA data do you want to process?**
  <radio-group direction="col" value={data} onChange={setData}>
    <radio value="documents">PDF reports and research papers only</radio>
    <radio value="datasets">Experimental datasets (CSV, TXT, Excel) only</radio>
    <radio value="both">Both documents and experimental datasets</radio>
  </radio-group>
  <divider color="subtle"/>
  **2. How comfortable is your team with Python and AI development?**
  <radio-group direction="col" value={stack} onChange={setStack}>
    <radio value="beginner">Beginner – need step-by-step implementation</radio>
    <radio value="intermediate">Intermediate – familiar with Python and APIs</radio>
    <radio value="advanced">Advanced – can build RAG and web applications</radio>
  </radio-group>
  <button block onClick={()=>GenUI.issueNewTurn("For our NASA Space Apps RAG architecture: data sources: "+data+". Team development level: "+stack+". Please design our practical implementation architecture and development steps.")}>Submit</button>
</box>

My preferred direction is **a hybrid RAG-based NASA Fire Safety Intelligence Platform**, not simply a chatbot. That distinction could make your submission considerably more impressive.

## USER

generate a prd for this for a software engineer who doesn’t know anything about fire safety and not from this field. make it as a pdf file

## ASSISTANT

bash -lc cat /home/oai/skills/pdfs/SKILL.md

## TOOL

The output of this plugin was redacted.

## ASSISTANT

I'll structure the PRD as a developer-ready specification for the **NASA Space Fire Safety Intelligence Platform**, assuming the engineer has no background in combustion or aerospace research.

It will cover the scientific concepts in plain English, the user experience, hybrid RAG architecture, NASA PSI data ingestion, database design, API requirements, experiment ranking, acceptance criteria, and a realistic 48-hour hackathon MVP.

The key design principle is to keep **scientific evidence, AI-generated interpretations, and experimental measurements clearly separated**, so developers can implement the system without accidentally presenting unsupported fire safety conclusions.



## ASSISTANT

bash -lc mkdir -p /mnt/data && cat > /mnt/data/build_prd.py <<'PY'
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, PageBreak, ListFlowable, ListItem
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.units import inch
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from xml.sax.saxutils import escape

OUT='/mnt/data/NASA_PSI_Fire_Safety_Intelligence_PRD.pdf'
pdfmetrics.registerFont(TTFont('DejaVu','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DejaVu-Bold','/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
navy=colors.HexColor('#13233D'); blue=colors.HexColor('#175DA8'); pale=colors.HexColor('#EAF2FA'); grey=colors.HexColor('#526174')
styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='CoverTitleX',fontName='DejaVu-Bold',fontSize=23,leading=31,textColor=navy,spaceAfter=20))
styles.add(ParagraphStyle(name='DeckX',fontName='DejaVu',fontSize=11,leading=18,textColor=grey,spaceAfter=20))
styles.add(ParagraphStyle(name='H1X',fontName='DejaVu-Bold',fontSize=15,leading=21,textColor=navy,spaceBefore=18,spaceAfter=9,keepWithNext=True))
styles.add(ParagraphStyle(name='H2X',fontName='DejaVu-Bold',fontSize=10.5,leading=15,textColor=blue,spaceBefore=12,spaceAfter=6,keepWithNext=True))
styles.add(ParagraphStyle(name='BodyX',fontName='DejaVu',fontSize=8.7,leading=14,spaceAfter=7))
styles.add(ParagraphStyle(name='BulletX',fontName='DejaVu',fontSize=8.6,leading=13.5,leftIndent=12,firstLineIndent=-8,spaceAfter=4))
styles.add(ParagraphStyle(name='SmallX',fontName='DejaVu',fontSize=7.4,leading=11))
styles.add(ParagraphStyle(name='HeaderX',fontName='DejaVu-Bold',fontSize=7.6,leading=11,textColor=colors.white))
S=[]
def p(t): S.append(Paragraph(t,styles['BodyX']))
def h(t): S.append(Paragraph(t,styles['H1X']))
def h2(t): S.append(Paragraph(t,styles['H2X']))
def b(t): S.append(Paragraph('&#8226; '+t,styles['BulletX']))
def tbl(headers,rows,widths=None):
 data=[[Paragraph(escape(str(x)),styles['HeaderX']) for x in headers]]
 for row in rows:data.append([Paragraph(str(x),styles['SmallX']) for x in row])
 t=Table(data,colWidths=widths,repeatRows=1,hAlign='LEFT')
 t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),navy),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor('#F3F7FB')]),('VALIGN',(0,0),(-1,-1),'TOP'),('BOTTOMPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),7),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('LINEBELOW',(0,-1),(-1,-1),0.5,colors.HexColor('#D4DFEB'))]))
 S.append(t);S.append(Spacer(1,9))

S.append(Spacer(1,90));S.append(Paragraph('PRODUCT REQUIREMENTS DOCUMENT',styles['H2X']))
S.append(Paragraph('NASA PSI Fire Safety<br/>Intelligence Platform',styles['CoverTitleX']))
S.append(Paragraph('A developer-first specification for a hybrid RAG research dashboard that makes NASA microgravity combustion evidence searchable, comparable, and understandable.',styles['DeckX']))
p('<b>Project:</b> NASA Space Apps Challenge 2026 - Flame in Freefall<br/><b>Version:</b> 1.0 | <b>Date:</b> 8 November 2026 | <b>Status:</b> Proposed hackathon MVP<br/><b>Audience:</b> Software engineers without prior fire science knowledge')
S.append(Spacer(1,30));p('<b>One-sentence product goal:</b> Help researchers and spacecraft engineers discover relevant NASA combustion investigations, compare verified test conditions, and ask evidence-grounded questions without reading dozens of unrelated documents.')
S.append(PageBreak())
h('1. Executive summary')
p('NASA has conducted experiments on flames, smoke, and fire suppression in microgravity. Relevant findings are spread across investigation pages, reports, publications, tables, and experimental files. The proposed product provides a searchable experiment catalog, structured condition filters, side-by-side comparison, and an AI assistant that cites its evidence.')
p('<b>Critical distinction:</b> This is a research discovery and decision-support prototype, NOT a certified fire-risk calculator, materials qualification system, or operational spacecraft safety authority.')
h2('Success in one demonstration')
p('A user selects <b>Lunar Habitat</b>, searches for <b>solid materials and elevated oxygen</b>, receives a ranked set of relevant investigations, opens a comparison of available oxygen/airflow/material conditions, and asks the AI what the evidence does and does not show. Every scientific claim links to its source.')
h2('Who uses it')
tbl(['Persona','Job to be done'],[['Aerospace engineer','Locate evidence relevant to material selection, detection, or suppression for a crewed environment.'],['Combustion researcher','Find and compare experimental conditions and measurements across studies.'],['Student / new researcher','Understand the basics and trace answers back to primary sources.'],['Challenge judge','See a working, credible, transparent end-to-end demo.']],[125,390])
h('2. Fire science explained for developers')
tbl(['Term','Plain-English meaning / why it matters'],[['Microgravity','Near-weightlessness, as on the ISS. Hot gases do not rise in the usual way, so flames and smoke move differently.'],['Flammability','How readily a material ignites and continues burning under specific conditions. Not a permanent yes/no property of a material.'],['Oxygen concentration','Fraction of the atmosphere that is oxygen, often expressed as %. More oxygen can increase fire hazards; pressure and other conditions also matter.'],['Pressure','Gas pressure inside a test chamber or habitat. A percentage of oxygen alone is not enough to characterize the environment.'],['Airflow / ventilation','Movement of surrounding gas; especially important in microgravity because buoyancy-driven flow is reduced.'],['Flame spread','How a flame moves across or through a fuel sample.'],['Fuel / sample','Material burned: e.g. a fabric, plastic, gaseous fuel, or liquid droplet.'],['Ignition / extinction','Fire starts / flame stops; exact experimental definitions must be read from source.'],['Sensor / measurement','Camera, thermocouple, aerosol instrument, or other device recording a test result.'],['Partial gravity','Gravity on the Moon or Mars; do not treat microgravity data as direct lunar/Martian measurements.']],[130,385])
p('<b>Developer rule:</b> Never infer a material is safe from a single test. Test geometry, oxygen, pressure, airflow, gravity, ignition method, and measurement definition can all change interpretation.')
h('3. Scope and priorities')
tbl(['Priority','In scope'],[['P0 - Must ship','Curated catalog of 10-20 source-verified records; search/filter; experiment detail; source citations; RAG Q&amp;A; clear limitations.'],['P1 - Strong MVP','Side-by-side comparison; relevance ranking with reasons; structured oxygen/pressure/airflow filtering where fields exist; downloadable result summary.'],['P2 - Stretch','Plots from validated numeric datasets; interactive scenario selector; research gap discovery; ingestion of more investigations.'],['Out of scope','Training a new foundation model; real-time spacecraft fire prediction; certification of materials; rocket/propellant safety; automatic conclusions from undocumented numerical files.']],[112,403])
h('4. Source data and ingestion')
p('<b>Primary source:</b> NASA Physical Sciences Informatics (PSI), https://psi.nasa.gov/physci/repo . Supporting source: NASA Technical Reports Server, https://ntrs.nasa.gov/ . Data availability, permissions, and downloadable formats must be checked per investigation; do not assume every experiment has a complete raw dataset.')
h2('Seed investigation families')
tbl(['Family','Why it is useful'],[['BASS / BASS-II','Burning and suppression of solid materials; airflow and flammability relevance.'],['Saffire I-III','Spacecraft-scale solid-material burning and flame-spread research.'],['FLEX / FLEX-2','Liquid droplet combustion and flame extinction.'],['SAME / SAME-R','Smoke and aerosol measurement for detection.'],['ACME investigations','Gaseous flames, combustion physics, and selected oxygen-related questions.']],[135,380])
h2('Ingestion pipeline')
b('1. Manually collect a verified seed set of NASA PSI investigation URLs, PDFs, metadata, and any downloadable datasets. Record access dates and source permissions.')
b('2. Extract text from PDFs and HTML. Preserve section headings, page numbers, tables, units, captions, and document identifiers.')
b('3. Create a structured experiment record with source-backed values; use null/unknown rather than guessing.')
b('4. Split prose into overlapping chunks with experiment ID, document ID, page/section, and source URL.')
b('5. Embed chunks and index them; separately index exact terms and maintain structured records in SQL.')
b('6. Validate at least 10 records manually against primary sources before using them in the demo.')
h('5. Functional requirements')
tbl(['ID','Requirement / expected behavior'],[['FR-01','Catalog: list investigations with name, objective, fuel class, relevance tags, and source link.'],['FR-02','Search: accept natural-language queries and exact investigation names; show matched evidence.'],['FR-03','Filters: material/fuel, experiment family, application, and verified oxygen/pressure/airflow ranges. Unknown values must not pass numerical filters.'],['FR-04','Detail: show objectives, setup, test variables, sensors, major findings, data availability, citations, and caveats.'],['FR-05','Compare: select 2-3 investigations; align comparable fields; show Not reported where missing; never mix incompatible units silently.'],['FR-06','Ask AI: answer only from retrieved sources; provide document/page/URL citations; say insufficient evidence when needed.'],['FR-07','Rank: display relevance score, criteria, weights, and explanation; score is research relevance, NOT safety.'],['FR-08','Insights: show supported findings, possible engineering implications, and research gaps as separate labels.'],['FR-09','Data provenance: every extracted numerical value stores source, location, unit, and verification status.'],['FR-10','Export: provide a CSV of selected records or a simple evidence summary with citations.']],[63,452])
h('6. User flows and acceptance tests')
h2('Flow A - Search and inspect')
p('User searches "solid material flammability in elevated oxygen" -> system returns ranked records -> user opens one -> sees verified conditions, missing fields, and primary-source links.')
p('<b>Acceptance:</b> At least one curated relevant result appears; source links resolve; a missing oxygen value is labeled "Not reported", never invented.')
h2('Flow B - Ask the research assistant')
p('User asks "What does BASS tell us about airflow?" -> hybrid retriever selects passages -> LLM produces concise answer with citations and limitations.')
p('<b>Acceptance:</b> Every substantive scientific claim has a supporting citation. If the indexed material does not answer, the response says so and suggests relevant sources.')
h2('Flow C - Compare investigations')
p('User selects BASS and Saffire -> comparison table displays objectives, fuel/sample, environment, airflow, measured outputs, and applicability.')
p('<b>Acceptance:</b> Units are shown; values from different test runs are not presented as a single experiment-wide condition; unknown fields are visible.')
h2('Flow D - Lunar habitat relevance')
p('User selects "Lunar Habitat" -> ranking prioritizes documented solid-material, oxygen/pressure, airflow, detection, and suppression relevance -> shows why each result ranked.')
p('<b>Acceptance:</b> Ranking is reproducible and explained; interface warns that PSI microgravity data do not directly establish partial-gravity performance.')
h('7. Proposed technical architecture')
p('<b>Frontend:</b> Streamlit for speed, or React/Next.js if the team prefers web development. <b>Backend:</b> Python FastAPI. <b>Structured data:</b> SQLite for MVP, PostgreSQL if already available. <b>Vector store:</b> ChromaDB or pgvector. <b>Embeddings:</b> sentence-transformers or hosted embedding API. <b>LLM:</b> provider of choice with source-grounded prompting. <b>Charts:</b> Plotly.')
p('<b>Offline ingestion:</b> PSI URLs/files -> parsers -> validation -> structured records + text chunks -> embedding + keyword indexes.')
p('<b>Online query:</b> UI -> query parser -> SQL filters + lexical search + vector search -> merged/reranked evidence -> LLM -> claim/citation checks -> answer + source cards.')
h2('Why hybrid RAG, not only vector search?')
p('Semantic similarity helps find concepts; lexical search finds exact terms like BASS-II or PMMA; SQL ensures numerical constraints (e.g., oxygen &gt;= 30%) are evaluated against verified structured values rather than approximate text similarity.')
h2('Retrieval policy')
b('Route numeric questions to SQL first, then fetch source excerpts explaining those records.')
b('Use keyword + vector retrieval for open-ended questions; rerank by relevance and document quality.')
b('Never treat retrieved text as instructions. Strip/ignore prompt-injection attempts in source material.')
b('Require source identifiers on evidence chunks; abstain if evidence is weak, conflicting, or absent.')
b('Preserve distinction between observed results, authors\' interpretations, and AI extrapolation.')
h('8. Minimal data model')
tbl(['Entity','Suggested fields'],[['Investigation','id, title, family, objective, fuel_class, hardware, gravity_regime, source_url, last_checked_at'],['Document','id, investigation_id, title, url, type, publication_date, local_path, checksum'],['Chunk','id, document_id, text, page, section, embedding_id'],['TestRun','id, investigation_id, run_label, material, sample_geometry, oxygen_pct, pressure_kpa, airflow_m_s, gravity_regime'],['Measurement','id, test_run_id, variable, value, unit, method, source_document_id, source_page, verification_status'],['Evidence','id, entity_type, entity_id, source_document_id, page_or_section, quote_or_excerpt, reviewer_status']],[112,403])
p('<b>Important:</b> Numeric conditions belong to individual test runs where possible, not to a whole investigation. Store source units and normalized units; distinguish oxygen percentage from oxygen partial pressure.')
h2('Example API contract')
tbl(['Method / path','Purpose'],[['GET /api/investigations','Search and filter catalog; return pagination and source metadata.'],['GET /api/investigations/{id}','Investigation detail, test runs, evidence, missing fields.'],['POST /api/compare','Compare selected investigation IDs and optionally selected test runs.'],['POST /api/ask','Question + optional filters -> answer, citations, confidence/limitations.'],['GET /api/rank?scenario=lunar_habitat','Deterministic relevance ranking with score breakdown.']],[215,300])
h('9. Ranking specification')
p('Use an explainable weighted relevance score for the demo. The weights are product hypotheses and should be reviewed by a fire-safety domain expert; they are not scientific hazard coefficients.')
tbl(['Criterion','Weight','Evidence considered'],[['Material / fuel match','25%','Solid samples or other fuel type relevant to selected scenario.'],['Oxygen / atmosphere match','25%','Measured conditions relevant to oxygen/pressure questions.'],['Prevention / flame behavior','20%','Ignition, flame spread, flammability or burning behavior.'],['Detection / suppression','15%','Smoke measurement, extinguishment or control relevance.'],['Habitat applicability','15%','Crew environment similarity and explicit study objectives.']],[175,65,275])
p('For each criterion, assign a documented match value from 0 to 1. <b>Score = 100 x sum(weight x match)</b>. Unknown evidence receives no positive match and is flagged; do not interpret a low score as low fire risk. Return score breakdown and at least one citation supporting each nonzero criterion.')
h('10. UI screens and information design')
b('<b>Home:</b> one-sentence purpose, scenario selector (spacecraft / lunar habitat / Mars habitat / rover), search box, featured investigations.')
b('<b>Explorer:</b> filter sidebar; investigation cards; sort by relevance, title, and data completeness.')
b('<b>Investigation detail:</b> overview, experimental setup, conditions by test run, sensors/outputs, evidence citations, data files.')
b('<b>Compare:</b> side-by-side table with unit labels, missing data, and caveats.')
b('<b>AI Assistant:</b> chat, source snippets, linked citations, follow-up prompts, explicit uncertainty.')
b('<b>Insights:</b> research relevance ranking, gaps, and export; not a pass/fail safety certification.')
h('11. Safety, quality, and nonfunctional requirements')
b('<b>Evidence:</b> cite source for all scientific claims; never fabricate experimental values, papers, page numbers, or URLs.')
b('<b>Numerics:</b> validate ranges and units; do not confuse percent oxygen, pressure, and oxygen partial pressure.')
b('<b>Transparency:</b> label "Measured", "Reported by authors", "AI interpretation", and "Not established" separately.')
b('<b>Performance target:</b> cached catalog/filter operations under 2 seconds on demo hardware; AI answers target under 15 seconds under normal provider availability (aspirational, not guaranteed).')
b('<b>Reliability:</b> ingest idempotently using document IDs/checksums; retain logs of extraction errors and source provenance.')
b('<b>Security:</b> secrets in environment variables, input limits, rate limiting if public, prompt-injection defenses, no untrusted code execution from files.')
b('<b>Accessibility:</b> keyboard-accessible controls, readable contrast, descriptive labels, and mobile-friendly layout.')
h('12. 48-hour implementation plan')
tbl(['Hours','Deliverable / owner'],[['0-4','Domain lead selects seed investigations, defines scientific fields, gathers URLs. Engineer sets up repository and UI skeleton.'],['4-10','Ingestion engineer parses first documents and builds SQL schema + chunk index; domain lead checks extraction.'],['10-20','Frontend engineer implements explorer/detail screens; backend exposes search/filter endpoints.'],['20-28','AI engineer adds hybrid retrieval, cited answers, abstention handling.'],['28-36','Team implements comparison and explainable ranking; domain lead validates 10-20 records.'],['36-42','End-to-end tests, numerical/unit checks, source-link verification, failure-mode tests.'],['42-48','Freeze features, prepare 3-minute demo, backup screenshots, and judge narrative.']],[65,450])
h2('Suggested team split')
p('Developer A: ingestion + database. Developer B: frontend + charts. Developer C: RAG + API. Domain lead: scientific schema, verification, relevance criteria, demo narrative. Small teams can combine roles.')
h('13. Definition of done / demo checklist')
for item in ['10-20 curated, source-verified investigation records are searchable.','At least 2 investigations can be compared side by side.','The AI answers 5 preselected questions with source citations and abstains on 2 unsupported questions.','Numeric filters operate only on validated, unit-normalized structured data.','Ranking shows criterion-level reasoning and states it is not a hazard score.','At least one lunar-habitat scenario demonstrates discovery -> comparison -> evidence-grounded insight.','Source links, error handling, and a short limitations statement work in the final demo.'] : b(item)
h('14. Example evaluation questions')
b('Which investigations directly examine burning of solid materials in microgravity?')
b('Which studies measured smoke/aerosol characteristics, and what instruments did they use?')
b('Compare BASS and Saffire in objectives, fuel types, and test environments.')
b('Which source-backed records mention elevated oxygen conditions?')
b('What evidence is relevant to a lunar habitat, and what cannot be concluded from microgravity results?')
b('What is the exact flame spread rate of a material when the database has no such measurement? Expected: abstain.')
b('Does a material tested in microgravity automatically qualify as safe on the Moon? Expected: no.')
h('15. Risks, assumptions, and open questions')
tbl(['Risk / decision','Mitigation / owner'],[['Dataset accessibility varies','Begin with verified accessible files; support metadata-only records. Domain lead.'],['Tables and units are extracted incorrectly','Manual review, source snippets, unit checks. Data + domain leads.'],['RAG hallucinates scientific conclusions','Grounded prompts, citations, abstention tests, evidence labeling. AI lead.'],['Ranking looks authoritative','Label as research relevance only; publish weights and caveats. Product lead.'],['Partial-gravity evidence is missing','Display explicit evidence gap; do not extrapolate as fact. Domain lead.'],['Time is too short','Prefer curated ingestion and working demo over broad automation. All.']],[185,330])
h2('Decisions to make before coding')
b('Will the team use Streamlit or React? Pick one immediately.')
b('Which 10-20 investigation records and source files are available to ingest?')
b('Who signs off on extracted oxygen, pressure, airflow, and fuel fields?')
b('Which LLM/embedding provider fits budget and network availability?')
b('Will numerical dataset plots be included only if validated test-run files exist?')
h('16. References and implementation starting points')
p('<b>NASA PSI repository:</b> https://psi.nasa.gov/physci/repo<br/><b>NASA Technical Reports Server:</b> https://ntrs.nasa.gov/<br/><b>NASA Biological and Physical Sciences:</b> https://science.nasa.gov/biological-physical/<br/><b>NASA Space Apps Challenge:</b> https://www.spaceappschallenge.org/')
p('<b>Source note:</b> This PRD is based on the challenge brief provided by the project team and general engineering design recommendations. It does not claim that all referenced experiment datasets, measurement fields, or specific files are currently accessible. Verify availability and scientific facts against NASA primary sources during implementation.')

def footer(c,doc):
 c.saveState();w,h=doc.pagesize;c.setStrokeColor(colors.HexColor('#CBD6E4'));c.line(44,43,w-44,43);c.setFont('DejaVu',7);c.setFillColor(grey);c.drawString(44,30,'NASA PSI Fire Safety Intelligence | Product Requirements Document');c.drawRightString(w-44,30,f'{doc.page}');c.restoreState()
doc=SimpleDocTemplate(OUT,pagesize=(612,792),rightMargin=47,leftMargin=47,topMargin=48,bottomMargin=58,title='NASA PSI Fire Safety Intelligence Platform - PRD',author='OpenAI')
doc.build(S,onFirstPage=footer,onLaterPages=footer)
print(OUT)
PY
python /mnt/data/build_prd.py
pdfinfo /mnt/data/NASA_PSI_Fire_Safety_Intelligence_PRD.pdf | grep Pages

## TOOL

The output of this plugin was redacted.

## ASSISTANT

I'll structure the PRD as a developer-ready specification for the **NASA Space Fire Safety Intelligence Platform**, assuming the engineer has no background in combustion or aerospace research.

It will cover the scientific concepts in plain English, the user experience, hybrid RAG architecture, NASA PSI data ingestion, database design, API requirements, experiment ranking, acceptance criteria, and a realistic 48-hour hackathon MVP.

The key design principle is to keep **scientific evidence, AI-generated interpretations, and experimental measurements clearly separated**, so developers can implement the system without accidentally presenting unsupported fire safety conclusions.

<box border radius="lg" padding={3} gap={2}>
  <row align="center" gap={3}>
    <icon name="file-text" color="secondary" size="2xl"/>
    <box flex="1" gap={1}>
      **NASA PSI Fire Safety Intelligence Platform — PRD**
      <text color="secondary" size="xs">PDF · 10 pages · Version 1.0</text>
    </box>
  </row>
  [<icon name="download" inline/> Download the PRD (PDF)](sandbox:/mnt/data/NASA_PSI_Fire_Safety_Intelligence_PRD.pdf)
</box>

The PRD is written specifically for **software engineers with no fire safety or combustion background**.

It includes 16 sections covering:

- Fire science concepts explained in simple language.
- Product goals, features, and user workflows.
- Hybrid RAG architecture and retrieval strategy.
- NASA PSI data ingestion and database schemas.
- API endpoints and functional requirements.
- Experiment comparison and relevance ranking.
- Scientific accuracy, citations, and AI safeguards.
- A 48-hour development roadmap.
- Acceptance criteria and testing scenarios.

**Recommended next step:** Give this PDF to your development team and use it as the starting specification for implementation.

---

If you want, I can:

- Guide me in exploring NASA PSI database
- Help me identify key NASA experiments to focus on
- Advise me on building the dashboard prototype

## ASSISTANT

<box border radius="lg" padding={3} gap={2}>
  <row align="center" gap={3}>
    <icon name="file-text" color="secondary" size="2xl"/>
    <box flex="1" gap={1}>
      **NASA PSI Fire Safety Intelligence Platform — PRD**
      <text color="secondary" size="xs">PDF · 10 pages · Version 1.0</text>
    </box>
  </row>
  [<icon name="download" inline/> Download the PRD (PDF)](sandbox:/mnt/data/NASA_PSI_Fire_Safety_Intelligence_PRD.pdf)
</box>

The PRD is written specifically for **software engineers with no fire safety or combustion background**.

It includes 16 sections covering:

- Fire science concepts explained in simple language.
- Product goals, features, and user workflows.
- Hybrid RAG architecture and retrieval strategy.
- NASA PSI data ingestion and database schemas.
- API endpoints and functional requirements.
- Experiment comparison and relevance ranking.
- Scientific accuracy, citations, and AI safeguards.
- A 48-hour development roadmap.
- Acceptance criteria and testing scenarios.

**Recommended next step:** Give this PDF to your development team and use it as the starting specification for implementation.
