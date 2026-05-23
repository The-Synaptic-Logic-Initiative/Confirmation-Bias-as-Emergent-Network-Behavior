# 🕸️ Confirmation Bias as Emergent Network Behavior

An interactive React + D3 simulation demonstrating how cognitive confirmation bias emerges naturally from **Hebbian learning**. There is no hardcoded bias, no rigged algorithms, and no "irrationality" programmed into this network. The bias grows entirely from the math itself.

![React](https://img.shields.io/badge/UI-React-61DAFB?logo=react&logoColor=black)
![D3.js](https://img.shields.io/badge/Graphing-D3.js-F9A03C?logo=d3.js&logoColor=white)
![Recharts](https://img.shields.io/badge/Charts-Recharts-22b5bf)
![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)

> *"Confirmation bias doesn't require a biased learner. It requires only that one belief was active first. The prior gives confirming evidence a head start. Hebbian learning does the rest. This is why changing minds is hard — you're not fighting irrationality, you're fighting physics."*

## 🎯 What is this?

This project visualizes a 14-node neural network where nodes represent concepts/beliefs and edges represent connection strengths. By using the simplest model of neurological learning—"Neurons that fire together, wire together"—we can watch a network entrench itself in real-time.

When a "Prior Belief" is injected into the network, it establishes initial strong pathways. When "Confirming Evidence" is later introduced, it easily travels along those hot pathways, resulting in massive weight increases. When "Contradicting Evidence" is introduced, the lack of pre-existing hot pathways means it is effectively ignored. **Bias emerges visually.**

### ✨ Features
* **Zero-Dependency Neural Engine:** The Hebbian update loop is written from scratch in pure JavaScript. No black-box ML libraries.
* **Live Force-Directed Graph:** Built with D3.js, the network physically reacts to activation, with edge thicknesses growing as synaptic weights increase.
* **Real-time Divergence Chart:** A live Recharts LineChart tracks the average weight of confirming vs. contradicting edges, visualizing the exact moment the bias takes hold.
* **Interactive Dashboard:** Inject prior beliefs, fire confirming/contradicting evidence, and tweak the learning and decay rates on the fly.
* **Contextual Explainer:** A dynamic UI card that guides users through the cognitive timeline of belief entrenchment.

## 🔬 The Science (How the Math Creates Bias)

The simulation runs a continuous tick loop based on strict Hebbian principles. There are no asymmetrical rules; all nodes are treated equally.

**1. Activation Spread**
Nodes pass their activation to their neighbors based on connection weight:
$$new\_activation_i = \tanh\left(\sum (weight_{ij} \times activation_j)\right)$$

**2. Hebbian Learning (The core engine)**
If two connected nodes are active at the same time, their connection strengthens. 
$$\Delta w = \eta \times activation_i \times activation_j$$
*(Where $\eta$ is the learning rate).*

**The Emergent Phenomenon:** Because the Prior nodes are activated *first*, any Confirming evidence (which shares semantic edges with the Prior) experiences a high $activation_j$ multiplier. Contradicting evidence has no active neighbors, so $activation_j \approx 0$, resulting in a tiny $\Delta w$. The bias is a purely physical phenomenon of temporal priority.

## 🚀 Getting Started

1. Clone the repository:
   ```bash
    git clone [https://github.com/yourusername/emergent-confirmation-bias.git](https://github.com/yourusername/emergent-confirmation-bias.git)

2. Navigate to the directory:
  ``bash
      cd emergent-confirmation-bias

4. Install dependencies:
      Bash
      npm install

5. Start the development server:
     Bash
     npm run dev


## 🛠️ Tech Stack Architecture
Framework: React (.jsx functional components)

Graph Layout: D3.js (Force-directed physics simulation and SVG rendering)

Data Visualization: Recharts (Smooth, animated line charts for weight history)

Styling: Tailwind CSS (Utility-first classes for a clean, dark-mode scientific aesthetic)

## 🤝 Contributing
Contributions, issues, and feature requests are highly encouraged! If you are interested in computational cognitive science, graph theory, or UI/UX for complex data, feel free to check the issues page or submit a pull request.

## 📝 License
This project is MIT licensed.
