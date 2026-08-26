/**
 * Stilisierte NRW-Karte fuer das Buehnen-Dashboard.
 *
 * Fuer Einreichungen mit anonymisierter Herkunft (5-km-Zelle, siehe
 * lib/geo-anonymize.ts) zeichnet das Dashboard die echte Zelle. Fehlt sie -
 * etwa bei Altbestaenden oder wenn die k-Anonymitaetsschwelle nicht erreicht
 * ist - faellt es auf eine *symbolische* Position zurueck: Jede Reparatur
 * bekommt aus ihrer ID eine deterministische Position im Umfeld eines
 * Ballungsraums. Gleiche ID ergibt immer denselben Punkt, damit die Wolke
 * zwischen zwei Renderings nicht springt.
 */

import { hashString, seededRandom } from "./hash";


export type LatLon = { lat: number; lon: number };

/** Aussenkontur von Nordrhein-Westfalen.
 *
 * Quelle: OpenStreetMap-Relation 62761 (Grenze des Landes), vereinfacht mit
 * Douglas-Peucker auf 212 Punkte. Das reicht, damit die charakteristischen
 * Merkmale erkennbar bleiben - Niederrhein und Kleve im Nordwesten, der
 * Einschnitt bei Osnabrueck, der Zipfel des Kreises Minden-Luebbecke im
 * Nordosten, das Weserbergland im Osten, das Siegerland im Sueden und die
 * Eifel mit dem Aachener Zipfel im Suedwesten.
 *
 * Kartendaten (c) OpenStreetMap-Mitwirkende, ODbL. Die Namensnennung steht
 * unter der Karte im Dashboard (siehe app/stats/page.tsx).
 */
export const nrwOutline: LatLon[] = [
  { lat: 51.051, lon: 5.866 }, { lat: 50.975, lon: 5.897 }, { lat: 50.983, lon: 6.027 }, { lat: 50.935, lon: 6.018 },
  { lat: 50.921, lon: 6.094 }, { lat: 50.847, lon: 6.074 }, { lat: 50.846, lon: 6.019 }, { lat: 50.814, lon: 6.025 },
  { lat: 50.798, lon: 5.975 }, { lat: 50.774, lon: 6.028 }, { lat: 50.718, lon: 6.039 }, { lat: 50.722, lon: 6.115 },
  { lat: 50.662, lon: 6.166 }, { lat: 50.663, lon: 6.195 }, { lat: 50.641, lon: 6.187 }, { lat: 50.642, lon: 6.266 },
  { lat: 50.530, lon: 6.197 }, { lat: 50.494, lon: 6.227 }, { lat: 50.488, lon: 6.351 }, { lat: 50.462, lon: 6.340 },
  { lat: 50.439, lon: 6.377 }, { lat: 50.380, lon: 6.343 }, { lat: 50.323, lon: 6.406 }, { lat: 50.334, lon: 6.424 },
  { lat: 50.384, lon: 6.385 }, { lat: 50.390, lon: 6.413 }, { lat: 50.361, lon: 6.460 }, { lat: 50.335, lon: 6.452 },
  { lat: 50.388, lon: 6.603 }, { lat: 50.352, lon: 6.624 }, { lat: 50.348, lon: 6.650 }, { lat: 50.372, lon: 6.668 },
  { lat: 50.336, lon: 6.699 }, { lat: 50.361, lon: 6.800 }, { lat: 50.473, lon: 6.745 }, { lat: 50.491, lon: 6.801 },
  { lat: 50.456, lon: 6.868 }, { lat: 50.485, lon: 6.906 }, { lat: 50.527, lon: 6.882 }, { lat: 50.533, lon: 6.930 },
  { lat: 50.560, lon: 6.931 }, { lat: 50.565, lon: 6.998 }, { lat: 50.606, lon: 7.056 }, { lat: 50.586, lon: 7.090 },
  { lat: 50.612, lon: 7.115 }, { lat: 50.600, lon: 7.148 }, { lat: 50.650, lon: 7.203 }, { lat: 50.623, lon: 7.213 },
  { lat: 50.638, lon: 7.334 }, { lat: 50.718, lon: 7.374 }, { lat: 50.710, lon: 7.437 }, { lat: 50.747, lon: 7.551 },
  { lat: 50.739, lon: 7.584 }, { lat: 50.768, lon: 7.601 }, { lat: 50.768, lon: 7.656 }, { lat: 50.794, lon: 7.683 },
  { lat: 50.820, lon: 7.659 }, { lat: 50.851, lon: 7.730 }, { lat: 50.845, lon: 7.763 }, { lat: 50.918, lon: 7.735 },
  { lat: 50.942, lon: 7.793 }, { lat: 50.928, lon: 7.849 }, { lat: 50.882, lon: 7.829 }, { lat: 50.834, lon: 7.978 },
  { lat: 50.783, lon: 7.964 }, { lat: 50.727, lon: 8.040 }, { lat: 50.697, lon: 8.039 }, { lat: 50.707, lon: 8.079 },
  { lat: 50.686, lon: 8.126 }, { lat: 50.736, lon: 8.167 }, { lat: 50.788, lon: 8.126 }, { lat: 50.883, lon: 8.270 },
  { lat: 50.861, lon: 8.358 }, { lat: 50.920, lon: 8.460 }, { lat: 50.966, lon: 8.458 }, { lat: 51.020, lon: 8.538 },
  { lat: 51.041, lon: 8.504 }, { lat: 51.063, lon: 8.527 }, { lat: 51.085, lon: 8.508 }, { lat: 51.104, lon: 8.551 },
  { lat: 51.095, lon: 8.656 }, { lat: 51.110, lon: 8.720 }, { lat: 51.132, lon: 8.692 }, { lat: 51.209, lon: 8.768 },
  { lat: 51.275, lon: 8.721 }, { lat: 51.247, lon: 8.609 }, { lat: 51.277, lon: 8.556 }, { lat: 51.336, lon: 8.621 },
  { lat: 51.377, lon: 8.695 }, { lat: 51.389, lon: 8.939 }, { lat: 51.425, lon: 8.949 }, { lat: 51.430, lon: 8.919 },
  { lat: 51.482, lon: 8.890 }, { lat: 51.519, lon: 9.020 }, { lat: 51.494, lon: 9.092 }, { lat: 51.445, lon: 9.094 },
  { lat: 51.460, lon: 9.216 }, { lat: 51.490, lon: 9.225 }, { lat: 51.512, lon: 9.309 }, { lat: 51.553, lon: 9.316 },
  { lat: 51.591, lon: 9.373 }, { lat: 51.615, lon: 9.337 }, { lat: 51.644, lon: 9.445 }, { lat: 51.650, lon: 9.375 },
  { lat: 51.704, lon: 9.402 }, { lat: 51.744, lon: 9.375 }, { lat: 51.795, lon: 9.449 }, { lat: 51.811, lon: 9.427 },
  { lat: 51.863, lon: 9.459 }, { lat: 51.855, lon: 9.323 }, { lat: 51.908, lon: 9.341 }, { lat: 51.930, lon: 9.274 },
  { lat: 51.974, lon: 9.274 }, { lat: 51.960, lon: 9.209 }, { lat: 51.981, lon: 9.176 }, { lat: 52.070, lon: 9.194 },
  { lat: 52.094, lon: 9.134 }, { lat: 52.129, lon: 9.154 }, { lat: 52.150, lon: 9.067 }, { lat: 52.133, lon: 9.018 },
  { lat: 52.172, lon: 9.022 }, { lat: 52.195, lon: 8.986 }, { lat: 52.183, lon: 9.046 }, { lat: 52.224, lon: 9.037 },
  { lat: 52.231, lon: 9.076 }, { lat: 52.279, lon: 8.963 }, { lat: 52.326, lon: 8.998 }, { lat: 52.371, lon: 9.098 },
  { lat: 52.413, lon: 9.125 }, { lat: 52.443, lon: 9.095 }, { lat: 52.484, lon: 9.134 }, { lat: 52.500, lon: 9.053 },
  { lat: 52.402, lon: 8.937 }, { lat: 52.389, lon: 8.853 }, { lat: 52.395, lon: 8.706 }, { lat: 52.503, lon: 8.702 },
  { lat: 52.531, lon: 8.652 }, { lat: 52.499, lon: 8.557 }, { lat: 52.515, lon: 8.509 }, { lat: 52.445, lon: 8.418 },
  { lat: 52.459, lon: 8.303 }, { lat: 52.407, lon: 8.312 }, { lat: 52.361, lon: 8.442 }, { lat: 52.316, lon: 8.471 },
  { lat: 52.214, lon: 8.442 }, { lat: 52.185, lon: 8.517 }, { lat: 52.137, lon: 8.411 }, { lat: 52.111, lon: 8.405 },
  { lat: 52.132, lon: 8.268 }, { lat: 52.072, lon: 8.193 }, { lat: 52.057, lon: 8.096 }, { lat: 52.068, lon: 8.033 },
  { lat: 52.036, lon: 7.981 }, { lat: 52.083, lon: 7.885 }, { lat: 52.115, lon: 8.008 }, { lat: 52.172, lon: 8.017 },
  { lat: 52.177, lon: 7.934 }, { lat: 52.207, lon: 7.900 }, { lat: 52.262, lon: 7.924 }, { lat: 52.273, lon: 7.957 },
  { lat: 52.302, lon: 7.932 }, { lat: 52.309, lon: 7.991 }, { lat: 52.365, lon: 7.937 }, { lat: 52.381, lon: 7.892 },
  { lat: 52.372, lon: 7.807 }, { lat: 52.401, lon: 7.714 }, { lat: 52.458, lon: 7.683 }, { lat: 52.475, lon: 7.604 },
  { lat: 52.432, lon: 7.564 }, { lat: 52.421, lon: 7.604 }, { lat: 52.377, lon: 7.582 }, { lat: 52.264, lon: 7.298 },
  { lat: 52.266, lon: 7.156 }, { lat: 52.227, lon: 6.989 }, { lat: 52.120, lon: 6.855 }, { lat: 52.119, lon: 6.761 },
  { lat: 52.040, lon: 6.688 }, { lat: 52.028, lon: 6.753 }, { lat: 51.972, lon: 6.833 }, { lat: 51.899, lon: 6.732 },
  { lat: 51.918, lon: 6.684 }, { lat: 51.854, lon: 6.473 }, { lat: 51.874, lon: 6.391 }, { lat: 51.827, lon: 6.402 },
  { lat: 51.849, lon: 6.306 }, { lat: 51.874, lon: 6.280 }, { lat: 51.869, lon: 6.210 }, { lat: 51.905, lon: 6.154 },
  { lat: 51.892, lon: 6.103 }, { lat: 51.862, lon: 6.167 }, { lat: 51.841, lon: 6.167 }, { lat: 51.865, lon: 6.063 },
  { lat: 51.832, lon: 6.002 }, { lat: 51.837, lon: 5.963 }, { lat: 51.813, lon: 5.947 }, { lat: 51.770, lon: 5.992 },
  { lat: 51.738, lon: 5.955 }, { lat: 51.717, lon: 6.045 }, { lat: 51.674, lon: 6.032 }, { lat: 51.656, lon: 6.118 },
  { lat: 51.606, lon: 6.091 }, { lat: 51.513, lon: 6.212 }, { lat: 51.360, lon: 6.226 }, { lat: 51.243, lon: 6.073 },
  { lat: 51.172, lon: 6.082 }, { lat: 51.194, lon: 6.165 }, { lat: 51.186, lon: 6.181 }, { lat: 51.173, lon: 6.139 },
  { lat: 51.158, lon: 6.175 }, { lat: 51.084, lon: 5.998 }, { lat: 51.035, lon: 5.958 }, { lat: 51.067, lon: 5.913 },
];

/**
 * Die 53 Kreise und kreisfreien Staedte.
 *
 * Auf der Buehnenkarte wird jeder Kreis fein umrissen und je nach Zahl der
 * Reparaturen darin unterschiedlich hell gefuellt. Damit ist die Karte eine
 * Auswertung: Man sieht auf einen Blick, wo im Land viel repariert wird - und
 * beim Zeigen auf einen Kreis dessen eigene Zahlen.
 *
 * Quelle wie die Landesgrenze: OpenStreetMap, Verwaltungsgrenzen der Ebene 6,
 * je Kreis auf durchschnittlich 47 Punkte vereinfacht. Ein Kreis mit Exklaven
 * ist auf seinen groessten Teil reduziert - fuer eine Buehnenkarte genuegt das.
 *
 * Kartendaten (c) OpenStreetMap-Mitwirkende, ODbL.
 */
export const nrwKreise: { name: string; outline: LatLon[] }[] = [
  {
    name: "Bielefeld",
    outline: [
    { lat: 51.973, lon: 8.378 }, { lat: 51.957, lon: 8.396 }, { lat: 51.960, lon: 8.420 }, { lat: 51.945, lon: 8.427 }, { lat: 51.945, lon: 8.487 },
    { lat: 51.915, lon: 8.506 }, { lat: 51.926, lon: 8.533 }, { lat: 51.925, lon: 8.547 }, { lat: 51.915, lon: 8.545 }, { lat: 51.925, lon: 8.562 },
    { lat: 51.925, lon: 8.600 }, { lat: 51.959, lon: 8.650 }, { lat: 51.967, lon: 8.641 }, { lat: 52.012, lon: 8.662 }, { lat: 52.027, lon: 8.642 },
    { lat: 52.039, lon: 8.661 }, { lat: 52.058, lon: 8.661 }, { lat: 52.067, lon: 8.617 }, { lat: 52.089, lon: 8.605 }, { lat: 52.076, lon: 8.571 },
    { lat: 52.106, lon: 8.569 }, { lat: 52.102, lon: 8.555 }, { lat: 52.115, lon: 8.516 }, { lat: 52.109, lon: 8.488 }, { lat: 52.067, lon: 8.447 },
    { lat: 52.050, lon: 8.453 }, { lat: 52.044, lon: 8.421 }, { lat: 52.019, lon: 8.461 }, { lat: 51.989, lon: 8.451 }, { lat: 51.970, lon: 8.406 },
    ],
  },
  {
    name: "Bochum",
    outline: [
    { lat: 51.481, lon: 7.102 }, { lat: 51.442, lon: 7.134 }, { lat: 51.431, lon: 7.119 }, { lat: 51.414, lon: 7.155 }, { lat: 51.420, lon: 7.182 },
    { lat: 51.412, lon: 7.250 }, { lat: 51.444, lon: 7.293 }, { lat: 51.454, lon: 7.288 }, { lat: 51.457, lon: 7.342 }, { lat: 51.466, lon: 7.349 },
    { lat: 51.493, lon: 7.343 }, { lat: 51.489, lon: 7.324 }, { lat: 51.506, lon: 7.317 }, { lat: 51.504, lon: 7.304 }, { lat: 51.523, lon: 7.315 },
    { lat: 51.531, lon: 7.295 }, { lat: 51.518, lon: 7.237 }, { lat: 51.522, lon: 7.202 }, { lat: 51.504, lon: 7.171 }, { lat: 51.506, lon: 7.139 },
    { lat: 51.491, lon: 7.138 },
    ],
  },
  {
    name: "Bonn",
    outline: [
    { lat: 50.706, lon: 7.023 }, { lat: 50.674, lon: 7.044 }, { lat: 50.662, lon: 7.037 }, { lat: 50.665, lon: 7.025 }, { lat: 50.654, lon: 7.026 },
    { lat: 50.633, lon: 7.057 }, { lat: 50.660, lon: 7.105 }, { lat: 50.647, lon: 7.128 }, { lat: 50.655, lon: 7.158 }, { lat: 50.642, lon: 7.194 },
    { lat: 50.650, lon: 7.211 }, { lat: 50.703, lon: 7.168 }, { lat: 50.713, lon: 7.197 }, { lat: 50.745, lon: 7.204 }, { lat: 50.753, lon: 7.158 },
    { lat: 50.774, lon: 7.125 }, { lat: 50.762, lon: 7.103 }, { lat: 50.771, lon: 7.067 }, { lat: 50.759, lon: 7.038 }, { lat: 50.726, lon: 7.030 },
    { lat: 50.719, lon: 7.040 },
    ],
  },
  {
    name: "Bottrop",
    outline: [
    { lat: 51.580, lon: 6.833 }, { lat: 51.567, lon: 6.868 }, { lat: 51.557, lon: 6.860 }, { lat: 51.503, lon: 6.908 }, { lat: 51.497, lon: 6.929 },
    { lat: 51.509, lon: 6.988 }, { lat: 51.539, lon: 6.997 }, { lat: 51.570, lon: 6.921 }, { lat: 51.585, lon: 6.930 }, { lat: 51.607, lon: 6.980 },
    { lat: 51.626, lon: 6.984 }, { lat: 51.635, lon: 6.966 }, { lat: 51.645, lon: 6.932 }, { lat: 51.631, lon: 6.868 }, { lat: 51.608, lon: 6.851 },
    { lat: 51.596, lon: 6.866 },
    ],
  },
  {
    name: "Dortmund",
    outline: [
    { lat: 51.508, lon: 7.302 }, { lat: 51.506, lon: 7.317 }, { lat: 51.489, lon: 7.324 }, { lat: 51.496, lon: 7.338 }, { lat: 51.484, lon: 7.343 },
    { lat: 51.474, lon: 7.389 }, { lat: 51.432, lon: 7.423 }, { lat: 51.436, lon: 7.461 }, { lat: 51.417, lon: 7.465 }, { lat: 51.416, lon: 7.493 },
    { lat: 51.418, lon: 7.512 }, { lat: 51.433, lon: 7.512 }, { lat: 51.435, lon: 7.532 }, { lat: 51.455, lon: 7.553 }, { lat: 51.466, lon: 7.546 },
    { lat: 51.475, lon: 7.572 }, { lat: 51.464, lon: 7.584 }, { lat: 51.471, lon: 7.600 }, { lat: 51.480, lon: 7.610 }, { lat: 51.508, lon: 7.596 },
    { lat: 51.528, lon: 7.638 }, { lat: 51.550, lon: 7.633 }, { lat: 51.549, lon: 7.608 }, { lat: 51.569, lon: 7.606 }, { lat: 51.566, lon: 7.591 },
    { lat: 51.583, lon: 7.590 }, { lat: 51.579, lon: 7.503 }, { lat: 51.593, lon: 7.490 }, { lat: 51.580, lon: 7.446 }, { lat: 51.585, lon: 7.418 },
    { lat: 51.600, lon: 7.419 }, { lat: 51.577, lon: 7.339 }, { lat: 51.528, lon: 7.364 }, { lat: 51.523, lon: 7.316 },
    ],
  },
  {
    name: "Duisburg",
    outline: [
    { lat: 51.411, lon: 6.626 }, { lat: 51.386, lon: 6.637 }, { lat: 51.389, lon: 6.674 }, { lat: 51.374, lon: 6.668 }, { lat: 51.377, lon: 6.680 },
    { lat: 51.358, lon: 6.654 }, { lat: 51.347, lon: 6.667 }, { lat: 51.333, lon: 6.714 }, { lat: 51.352, lon: 6.747 }, { lat: 51.343, lon: 6.782 },
    { lat: 51.352, lon: 6.794 }, { lat: 51.352, lon: 6.830 }, { lat: 51.369, lon: 6.815 }, { lat: 51.438, lon: 6.818 }, { lat: 51.447, lon: 6.807 },
    { lat: 51.497, lon: 6.824 }, { lat: 51.523, lon: 6.777 }, { lat: 51.533, lon: 6.784 }, { lat: 51.536, lon: 6.747 }, { lat: 51.560, lon: 6.686 },
    { lat: 51.538, lon: 6.677 }, { lat: 51.519, lon: 6.697 }, { lat: 51.504, lon: 6.628 }, { lat: 51.481, lon: 6.643 }, { lat: 51.489, lon: 6.653 },
    { lat: 51.484, lon: 6.666 }, { lat: 51.474, lon: 6.655 }, { lat: 51.474, lon: 6.667 }, { lat: 51.452, lon: 6.679 }, { lat: 51.411, lon: 6.666 },
    { lat: 51.420, lon: 6.629 },
    ],
  },
  {
    name: "Düsseldorf",
    outline: [
    { lat: 51.229, lon: 6.689 }, { lat: 51.226, lon: 6.724 }, { lat: 51.183, lon: 6.737 }, { lat: 51.181, lon: 6.793 }, { lat: 51.144, lon: 6.799 },
    { lat: 51.163, lon: 6.847 }, { lat: 51.126, lon: 6.856 }, { lat: 51.130, lon: 6.919 }, { lat: 51.142, lon: 6.923 }, { lat: 51.159, lon: 6.891 },
    { lat: 51.193, lon: 6.921 }, { lat: 51.201, lon: 6.905 }, { lat: 51.211, lon: 6.911 }, { lat: 51.214, lon: 6.879 }, { lat: 51.241, lon: 6.871 },
    { lat: 51.238, lon: 6.931 }, { lat: 51.266, lon: 6.928 }, { lat: 51.273, lon: 6.940 }, { lat: 51.276, lon: 6.913 }, { lat: 51.265, lon: 6.896 },
    { lat: 51.275, lon: 6.876 }, { lat: 51.279, lon: 6.804 }, { lat: 51.321, lon: 6.817 }, { lat: 51.328, lon: 6.803 }, { lat: 51.350, lon: 6.806 },
    { lat: 51.343, lon: 6.782 }, { lat: 51.352, lon: 6.747 }, { lat: 51.333, lon: 6.714 }, { lat: 51.313, lon: 6.735 }, { lat: 51.271, lon: 6.703 },
    { lat: 51.257, lon: 6.727 },
    ],
  },
  {
    name: "Ennepe-Ruhr-Kreis",
    outline: [
    { lat: 51.406, lon: 7.108 }, { lat: 51.381, lon: 7.117 }, { lat: 51.377, lon: 7.150 }, { lat: 51.365, lon: 7.160 }, { lat: 51.340, lon: 7.145 },
    { lat: 51.306, lon: 7.181 }, { lat: 51.298, lon: 7.169 }, { lat: 51.295, lon: 7.199 }, { lat: 51.318, lon: 7.264 }, { lat: 51.287, lon: 7.256 },
    { lat: 51.272, lon: 7.278 }, { lat: 51.255, lon: 7.270 }, { lat: 51.253, lon: 7.304 }, { lat: 51.240, lon: 7.307 }, { lat: 51.250, lon: 7.331 },
    { lat: 51.239, lon: 7.341 }, { lat: 51.246, lon: 7.392 }, { lat: 51.225, lon: 7.398 }, { lat: 51.220, lon: 7.410 }, { lat: 51.228, lon: 7.423 },
    { lat: 51.213, lon: 7.435 }, { lat: 51.228, lon: 7.446 }, { lat: 51.243, lon: 7.501 }, { lat: 51.252, lon: 7.495 }, { lat: 51.270, lon: 7.521 },
    { lat: 51.287, lon: 7.479 }, { lat: 51.306, lon: 7.508 }, { lat: 51.316, lon: 7.504 }, { lat: 51.316, lon: 7.440 }, { lat: 51.290, lon: 7.432 },
    { lat: 51.302, lon: 7.400 }, { lat: 51.311, lon: 7.419 }, { lat: 51.330, lon: 7.423 }, { lat: 51.326, lon: 7.393 }, { lat: 51.340, lon: 7.391 },
    { lat: 51.343, lon: 7.376 }, { lat: 51.353, lon: 7.395 }, { lat: 51.396, lon: 7.404 }, { lat: 51.402, lon: 7.416 }, { lat: 51.392, lon: 7.435 },
    { lat: 51.399, lon: 7.451 }, { lat: 51.431, lon: 7.468 }, { lat: 51.432, lon: 7.423 }, { lat: 51.479, lon: 7.381 }, { lat: 51.484, lon: 7.353 },
    { lat: 51.457, lon: 7.342 }, { lat: 51.454, lon: 7.288 }, { lat: 51.444, lon: 7.293 }, { lat: 51.412, lon: 7.250 }, { lat: 51.420, lon: 7.182 },
    { lat: 51.414, lon: 7.155 }, { lat: 51.425, lon: 7.138 },
    ],
  },
  {
    name: "Essen",
    outline: [
    { lat: 51.476, lon: 6.894 }, { lat: 51.463, lon: 6.917 }, { lat: 51.450, lon: 6.915 }, { lat: 51.449, lon: 6.951 }, { lat: 51.439, lon: 6.960 },
    { lat: 51.389, lon: 6.943 }, { lat: 51.379, lon: 6.911 }, { lat: 51.368, lon: 6.905 }, { lat: 51.348, lon: 6.926 }, { lat: 51.348, lon: 6.964 },
    { lat: 51.365, lon: 7.017 }, { lat: 51.362, lon: 7.055 }, { lat: 51.378, lon: 7.120 }, { lat: 51.406, lon: 7.108 }, { lat: 51.425, lon: 7.138 },
    { lat: 51.431, lon: 7.119 }, { lat: 51.442, lon: 7.134 }, { lat: 51.459, lon: 7.110 }, { lat: 51.472, lon: 7.114 }, { lat: 51.483, lon: 7.074 },
    { lat: 51.495, lon: 7.072 }, { lat: 51.512, lon: 7.050 }, { lat: 51.518, lon: 7.020 }, { lat: 51.532, lon: 7.014 }, { lat: 51.531, lon: 6.995 },
    { lat: 51.509, lon: 6.988 }, { lat: 51.497, lon: 6.919 },
    ],
  },
  {
    name: "Gelsenkirchen",
    outline: [
    { lat: 51.623, lon: 6.987 }, { lat: 51.620, lon: 6.998 }, { lat: 51.594, lon: 6.994 }, { lat: 51.587, lon: 7.013 }, { lat: 51.564, lon: 7.013 },
    { lat: 51.547, lon: 7.032 }, { lat: 51.535, lon: 7.010 }, { lat: 51.518, lon: 7.020 }, { lat: 51.512, lon: 7.050 }, { lat: 51.483, lon: 7.074 },
    { lat: 51.491, lon: 7.138 }, { lat: 51.514, lon: 7.144 }, { lat: 51.547, lon: 7.124 }, { lat: 51.552, lon: 7.145 }, { lat: 51.573, lon: 7.137 },
    { lat: 51.594, lon: 7.105 }, { lat: 51.588, lon: 7.076 }, { lat: 51.605, lon: 7.078 }, { lat: 51.631, lon: 7.033 },
    ],
  },
  {
    name: "Hagen",
    outline: [
    { lat: 51.343, lon: 7.376 }, { lat: 51.340, lon: 7.391 }, { lat: 51.326, lon: 7.393 }, { lat: 51.332, lon: 7.398 }, { lat: 51.328, lon: 7.424 },
    { lat: 51.300, lon: 7.401 }, { lat: 51.290, lon: 7.432 }, { lat: 51.316, lon: 7.440 }, { lat: 51.316, lon: 7.504 }, { lat: 51.306, lon: 7.508 },
    { lat: 51.293, lon: 7.484 }, { lat: 51.280, lon: 7.482 }, { lat: 51.277, lon: 7.516 }, { lat: 51.265, lon: 7.519 }, { lat: 51.269, lon: 7.549 },
    { lat: 51.296, lon: 7.583 }, { lat: 51.330, lon: 7.577 }, { lat: 51.347, lon: 7.599 }, { lat: 51.385, lon: 7.590 }, { lat: 51.398, lon: 7.567 },
    { lat: 51.396, lon: 7.531 }, { lat: 51.405, lon: 7.535 }, { lat: 51.418, lon: 7.511 }, { lat: 51.417, lon: 7.463 }, { lat: 51.392, lon: 7.435 },
    { lat: 51.402, lon: 7.416 }, { lat: 51.396, lon: 7.404 }, { lat: 51.353, lon: 7.395 },
    ],
  },
  {
    name: "Hamm",
    outline: [
    { lat: 51.659, lon: 7.675 }, { lat: 51.613, lon: 7.690 }, { lat: 51.613, lon: 7.716 }, { lat: 51.627, lon: 7.728 }, { lat: 51.622, lon: 7.811 },
    { lat: 51.578, lon: 7.824 }, { lat: 51.595, lon: 7.870 }, { lat: 51.596, lon: 7.914 }, { lat: 51.614, lon: 7.911 }, { lat: 51.642, lon: 7.949 },
    { lat: 51.673, lon: 7.953 }, { lat: 51.674, lon: 7.997 }, { lat: 51.704, lon: 7.939 }, { lat: 51.703, lon: 7.890 }, { lat: 51.728, lon: 7.876 },
    { lat: 51.730, lon: 7.835 }, { lat: 51.745, lon: 7.826 }, { lat: 51.724, lon: 7.769 }, { lat: 51.739, lon: 7.752 }, { lat: 51.738, lon: 7.737 },
    { lat: 51.707, lon: 7.699 }, { lat: 51.674, lon: 7.728 },
    ],
  },
  {
    name: "Herne",
    outline: [
    { lat: 51.547, lon: 7.124 }, { lat: 51.509, lon: 7.137 }, { lat: 51.503, lon: 7.152 }, { lat: 51.507, lon: 7.186 }, { lat: 51.522, lon: 7.202 },
    { lat: 51.525, lon: 7.285 }, { lat: 51.538, lon: 7.296 }, { lat: 51.569, lon: 7.264 }, { lat: 51.565, lon: 7.250 }, { lat: 51.573, lon: 7.243 },
    { lat: 51.551, lon: 7.175 },
    ],
  },
  {
    name: "Hochsauerlandkreis",
    outline: [
    { lat: 51.459, lon: 7.864 }, { lat: 51.415, lon: 7.896 }, { lat: 51.348, lon: 7.906 }, { lat: 51.334, lon: 7.932 }, { lat: 51.320, lon: 7.934 },
    { lat: 51.306, lon: 7.901 }, { lat: 51.297, lon: 7.919 }, { lat: 51.277, lon: 7.903 }, { lat: 51.260, lon: 7.922 }, { lat: 51.244, lon: 7.919 },
    { lat: 51.246, lon: 7.930 }, { lat: 51.233, lon: 7.936 }, { lat: 51.240, lon: 7.947 }, { lat: 51.235, lon: 7.996 }, { lat: 51.247, lon: 8.019 },
    { lat: 51.237, lon: 8.044 }, { lat: 51.248, lon: 8.054 }, { lat: 51.240, lon: 8.119 }, { lat: 51.214, lon: 8.100 }, { lat: 51.173, lon: 8.151 },
    { lat: 51.145, lon: 8.130 }, { lat: 51.136, lon: 8.143 }, { lat: 51.146, lon: 8.184 }, { lat: 51.122, lon: 8.195 }, { lat: 51.122, lon: 8.226 },
    { lat: 51.100, lon: 8.252 }, { lat: 51.093, lon: 8.341 }, { lat: 51.133, lon: 8.405 }, { lat: 51.142, lon: 8.438 }, { lat: 51.135, lon: 8.455 },
    { lat: 51.150, lon: 8.485 }, { lat: 51.103, lon: 8.549 }, { lat: 51.095, lon: 8.656 }, { lat: 51.110, lon: 8.719 }, { lat: 51.132, lon: 8.692 },
    { lat: 51.177, lon: 8.758 }, { lat: 51.198, lon: 8.750 }, { lat: 51.209, lon: 8.768 }, { lat: 51.219, lon: 8.741 }, { lat: 51.250, lon: 8.727 },
    { lat: 51.261, lon: 8.737 }, { lat: 51.275, lon: 8.721 }, { lat: 51.261, lon: 8.628 }, { lat: 51.247, lon: 8.609 }, { lat: 51.250, lon: 8.590 },
    { lat: 51.278, lon: 8.557 }, { lat: 51.336, lon: 8.621 }, { lat: 51.340, lon: 8.654 }, { lat: 51.360, lon: 8.680 }, { lat: 51.374, lon: 8.683 },
    { lat: 51.372, lon: 8.733 }, { lat: 51.391, lon: 8.804 }, { lat: 51.377, lon: 8.854 }, { lat: 51.392, lon: 8.890 }, { lat: 51.389, lon: 8.939 },
    { lat: 51.425, lon: 8.949 }, { lat: 51.430, lon: 8.919 }, { lat: 51.446, lon: 8.922 }, { lat: 51.482, lon: 8.890 }, { lat: 51.508, lon: 8.971 },
    { lat: 51.506, lon: 8.949 }, { lat: 51.530, lon: 8.895 }, { lat: 51.547, lon: 8.892 }, { lat: 51.548, lon: 8.849 }, { lat: 51.538, lon: 8.846 },
    { lat: 51.540, lon: 8.815 }, { lat: 51.527, lon: 8.806 }, { lat: 51.495, lon: 8.836 }, { lat: 51.447, lon: 8.768 }, { lat: 51.466, lon: 8.752 },
    { lat: 51.459, lon: 8.721 }, { lat: 51.481, lon: 8.654 }, { lat: 51.485, lon: 8.604 }, { lat: 51.441, lon: 8.471 }, { lat: 51.406, lon: 8.418 },
    { lat: 51.408, lon: 8.392 }, { lat: 51.396, lon: 8.365 }, { lat: 51.389, lon: 8.298 }, { lat: 51.407, lon: 8.276 }, { lat: 51.408, lon: 8.214 },
    { lat: 51.442, lon: 8.158 }, { lat: 51.447, lon: 8.051 }, { lat: 51.475, lon: 8.003 }, { lat: 51.466, lon: 7.954 }, { lat: 51.474, lon: 7.920 },
    { lat: 51.491, lon: 7.908 },
    ],
  },
  {
    name: "Köln",
    outline: [
    { lat: 51.062, lon: 6.773 }, { lat: 51.037, lon: 6.798 }, { lat: 51.039, lon: 6.821 }, { lat: 51.025, lon: 6.842 }, { lat: 50.989, lon: 6.845 },
    { lat: 50.939, lon: 6.805 }, { lat: 50.926, lon: 6.842 }, { lat: 50.904, lon: 6.860 }, { lat: 50.912, lon: 6.880 }, { lat: 50.893, lon: 6.920 },
    { lat: 50.859, lon: 6.916 }, { lat: 50.837, lon: 6.930 }, { lat: 50.845, lon: 6.945 }, { lat: 50.835, lon: 6.955 }, { lat: 50.844, lon: 6.974 },
    { lat: 50.838, lon: 7.016 }, { lat: 50.850, lon: 7.051 }, { lat: 50.830, lon: 7.063 }, { lat: 50.831, lon: 7.079 }, { lat: 50.867, lon: 7.160 },
    { lat: 50.881, lon: 7.138 }, { lat: 50.946, lon: 7.145 }, { lat: 50.941, lon: 7.115 }, { lat: 50.957, lon: 7.087 }, { lat: 50.981, lon: 7.100 },
    { lat: 50.989, lon: 7.069 }, { lat: 51.018, lon: 7.068 }, { lat: 51.023, lon: 7.009 }, { lat: 51.011, lon: 6.976 }, { lat: 51.033, lon: 6.962 },
    { lat: 51.085, lon: 6.849 }, { lat: 51.074, lon: 6.825 }, { lat: 51.060, lon: 6.834 }, { lat: 51.046, lon: 6.814 }, { lat: 51.067, lon: 6.791 },
    ],
  },
  {
    name: "Krefeld",
    outline: [
    { lat: 51.386, lon: 6.478 }, { lat: 51.346, lon: 6.486 }, { lat: 51.335, lon: 6.515 }, { lat: 51.310, lon: 6.512 }, { lat: 51.303, lon: 6.489 },
    { lat: 51.290, lon: 6.500 }, { lat: 51.289, lon: 6.620 }, { lat: 51.309, lon: 6.621 }, { lat: 51.309, lon: 6.652 }, { lat: 51.337, lon: 6.706 },
    { lat: 51.353, lon: 6.655 }, { lat: 51.377, lon: 6.680 }, { lat: 51.374, lon: 6.668 }, { lat: 51.389, lon: 6.673 }, { lat: 51.382, lon: 6.648 },
    { lat: 51.397, lon: 6.608 }, { lat: 51.389, lon: 6.562 }, { lat: 51.405, lon: 6.536 }, { lat: 51.398, lon: 6.524 }, { lat: 51.402, lon: 6.492 },
    ],
  },
  {
    name: "Kreis Borken",
    outline: [
    { lat: 51.864, lon: 6.387 }, { lat: 51.853, lon: 6.409 }, { lat: 51.837, lon: 6.403 }, { lat: 51.819, lon: 6.427 }, { lat: 51.805, lon: 6.423 },
    { lat: 51.817, lon: 6.518 }, { lat: 51.790, lon: 6.569 }, { lat: 51.802, lon: 6.593 }, { lat: 51.794, lon: 6.609 }, { lat: 51.798, lon: 6.639 },
    { lat: 51.777, lon: 6.668 }, { lat: 51.781, lon: 6.714 }, { lat: 51.772, lon: 6.708 }, { lat: 51.768, lon: 6.722 }, { lat: 51.776, lon: 6.758 },
    { lat: 51.746, lon: 6.772 }, { lat: 51.743, lon: 6.819 }, { lat: 51.730, lon: 6.828 }, { lat: 51.737, lon: 6.849 }, { lat: 51.729, lon: 6.858 },
    { lat: 51.746, lon: 6.911 }, { lat: 51.779, lon: 6.916 }, { lat: 51.772, lon: 6.956 }, { lat: 51.799, lon: 6.977 }, { lat: 51.800, lon: 7.020 },
    { lat: 51.784, lon: 7.030 }, { lat: 51.777, lon: 7.075 }, { lat: 51.821, lon: 7.174 }, { lat: 51.832, lon: 7.125 }, { lat: 51.852, lon: 7.087 },
    { lat: 51.888, lon: 7.056 }, { lat: 51.927, lon: 7.082 }, { lat: 51.974, lon: 7.090 }, { lat: 51.989, lon: 7.056 }, { lat: 52.012, lon: 7.055 },
    { lat: 52.006, lon: 7.098 }, { lat: 52.047, lon: 7.169 }, { lat: 52.043, lon: 7.244 }, { lat: 52.066, lon: 7.274 }, { lat: 52.082, lon: 7.260 },
    { lat: 52.100, lon: 7.267 }, { lat: 52.120, lon: 7.251 }, { lat: 52.116, lon: 7.217 }, { lat: 52.136, lon: 7.151 }, { lat: 52.155, lon: 7.135 },
    { lat: 52.166, lon: 7.151 }, { lat: 52.201, lon: 7.096 }, { lat: 52.243, lon: 7.100 }, { lat: 52.226, lon: 7.026 }, { lat: 52.227, lon: 6.989 },
    { lat: 52.181, lon: 6.951 }, { lat: 52.176, lon: 6.908 }, { lat: 52.156, lon: 6.880 }, { lat: 52.130, lon: 6.873 }, { lat: 52.120, lon: 6.855 },
    { lat: 52.119, lon: 6.761 }, { lat: 52.082, lon: 6.748 }, { lat: 52.070, lon: 6.695 }, { lat: 52.040, lon: 6.688 }, { lat: 52.028, lon: 6.753 },
    { lat: 51.986, lon: 6.830 }, { lat: 51.964, lon: 6.829 }, { lat: 51.959, lon: 6.799 }, { lat: 51.935, lon: 6.794 }, { lat: 51.916, lon: 6.770 },
    { lat: 51.896, lon: 6.722 }, { lat: 51.916, lon: 6.695 }, { lat: 51.916, lon: 6.675 }, { lat: 51.885, lon: 6.544 }, { lat: 51.854, lon: 6.473 },
    { lat: 51.874, lon: 6.392 },
    ],
  },
  {
    name: "Kreis Coesfeld",
    outline: [
    { lat: 52.004, lon: 7.052 }, { lat: 51.989, lon: 7.056 }, { lat: 51.975, lon: 7.090 }, { lat: 51.927, lon: 7.082 }, { lat: 51.888, lon: 7.056 },
    { lat: 51.855, lon: 7.083 }, { lat: 51.832, lon: 7.125 }, { lat: 51.800, lon: 7.260 }, { lat: 51.780, lon: 7.272 }, { lat: 51.773, lon: 7.259 },
    { lat: 51.749, lon: 7.280 }, { lat: 51.737, lon: 7.321 }, { lat: 51.706, lon: 7.299 }, { lat: 51.712, lon: 7.311 }, { lat: 51.703, lon: 7.309 },
    { lat: 51.699, lon: 7.345 }, { lat: 51.687, lon: 7.340 }, { lat: 51.665, lon: 7.409 }, { lat: 51.669, lon: 7.435 }, { lat: 51.690, lon: 7.452 },
    { lat: 51.715, lon: 7.424 }, { lat: 51.736, lon: 7.467 }, { lat: 51.714, lon: 7.484 }, { lat: 51.721, lon: 7.517 }, { lat: 51.685, lon: 7.542 },
    { lat: 51.716, lon: 7.614 }, { lat: 51.706, lon: 7.651 }, { lat: 51.726, lon: 7.677 }, { lat: 51.729, lon: 7.687 }, { lat: 51.712, lon: 7.702 },
    { lat: 51.730, lon: 7.737 }, { lat: 51.751, lon: 7.730 }, { lat: 51.750, lon: 7.713 }, { lat: 51.785, lon: 7.685 }, { lat: 51.818, lon: 7.672 },
    { lat: 51.854, lon: 7.560 }, { lat: 51.901, lon: 7.535 }, { lat: 51.894, lon: 7.510 }, { lat: 51.936, lon: 7.512 }, { lat: 51.942, lon: 7.474 },
    { lat: 51.957, lon: 7.481 }, { lat: 51.978, lon: 7.523 }, { lat: 51.999, lon: 7.513 }, { lat: 52.001, lon: 7.433 }, { lat: 52.024, lon: 7.434 },
    { lat: 52.039, lon: 7.415 }, { lat: 52.027, lon: 7.370 }, { lat: 52.038, lon: 7.356 }, { lat: 52.045, lon: 7.303 }, { lat: 52.062, lon: 7.288 },
    { lat: 52.043, lon: 7.244 }, { lat: 52.047, lon: 7.169 }, { lat: 52.015, lon: 7.125 }, { lat: 52.006, lon: 7.090 }, { lat: 52.012, lon: 7.055 },
    ],
  },
  {
    name: "Kreis Düren",
    outline: [
    { lat: 50.962, lon: 6.194 }, { lat: 50.944, lon: 6.202 }, { lat: 50.935, lon: 6.230 }, { lat: 50.921, lon: 6.229 }, { lat: 50.902, lon: 6.200 },
    { lat: 50.874, lon: 6.230 }, { lat: 50.867, lon: 6.223 }, { lat: 50.873, lon: 6.242 }, { lat: 50.863, lon: 6.268 }, { lat: 50.883, lon: 6.308 },
    { lat: 50.817, lon: 6.340 }, { lat: 50.792, lon: 6.299 }, { lat: 50.771, lon: 6.318 }, { lat: 50.789, lon: 6.353 }, { lat: 50.759, lon: 6.366 },
    { lat: 50.755, lon: 6.342 }, { lat: 50.716, lon: 6.313 }, { lat: 50.691, lon: 6.313 }, { lat: 50.687, lon: 6.286 }, { lat: 50.673, lon: 6.288 },
    { lat: 50.665, lon: 6.323 }, { lat: 50.651, lon: 6.335 }, { lat: 50.669, lon: 6.376 }, { lat: 50.644, lon: 6.383 }, { lat: 50.650, lon: 6.391 },
    { lat: 50.642, lon: 6.411 }, { lat: 50.629, lon: 6.408 }, { lat: 50.634, lon: 6.394 }, { lat: 50.625, lon: 6.397 }, { lat: 50.623, lon: 6.381 },
    { lat: 50.618, lon: 6.395 }, { lat: 50.606, lon: 6.389 }, { lat: 50.601, lon: 6.414 }, { lat: 50.619, lon: 6.422 }, { lat: 50.600, lon: 6.491 },
    { lat: 50.600, lon: 6.553 }, { lat: 50.627, lon: 6.559 }, { lat: 50.640, lon: 6.578 }, { lat: 50.656, lon: 6.567 }, { lat: 50.673, lon: 6.601 },
    { lat: 50.708, lon: 6.589 }, { lat: 50.714, lon: 6.613 }, { lat: 50.734, lon: 6.626 }, { lat: 50.713, lon: 6.679 }, { lat: 50.731, lon: 6.703 },
    { lat: 50.774, lon: 6.679 }, { lat: 50.788, lon: 6.713 }, { lat: 50.801, lon: 6.704 }, { lat: 50.804, lon: 6.718 }, { lat: 50.824, lon: 6.718 },
    { lat: 50.835, lon: 6.706 }, { lat: 50.838, lon: 6.677 }, { lat: 50.831, lon: 6.677 }, { lat: 50.835, lon: 6.653 }, { lat: 50.822, lon: 6.624 },
    { lat: 50.848, lon: 6.598 }, { lat: 50.850, lon: 6.551 }, { lat: 50.878, lon: 6.562 }, { lat: 50.893, lon: 6.553 }, { lat: 50.896, lon: 6.519 },
    { lat: 50.932, lon: 6.525 }, { lat: 50.931, lon: 6.503 }, { lat: 50.952, lon: 6.485 }, { lat: 50.963, lon: 6.479 }, { lat: 50.977, lon: 6.499 },
    { lat: 50.984, lon: 6.474 }, { lat: 51.004, lon: 6.459 }, { lat: 51.019, lon: 6.466 }, { lat: 51.020, lon: 6.454 }, { lat: 51.034, lon: 6.480 },
    { lat: 51.046, lon: 6.452 }, { lat: 51.034, lon: 6.431 }, { lat: 51.034, lon: 6.372 }, { lat: 51.017, lon: 6.362 }, { lat: 51.013, lon: 6.322 },
    { lat: 51.025, lon: 6.290 }, { lat: 50.997, lon: 6.273 }, { lat: 50.988, lon: 6.231 },
    ],
  },
  {
    name: "Kreis Euskirchen",
    outline: [
    { lat: 50.496, lon: 6.317 }, { lat: 50.488, lon: 6.351 }, { lat: 50.462, lon: 6.340 }, { lat: 50.452, lon: 6.374 }, { lat: 50.409, lon: 6.370 },
    { lat: 50.380, lon: 6.343 }, { lat: 50.345, lon: 6.399 }, { lat: 50.323, lon: 6.406 }, { lat: 50.323, lon: 6.426 }, { lat: 50.334, lon: 6.424 },
    { lat: 50.341, lon: 6.407 }, { lat: 50.364, lon: 6.406 }, { lat: 50.362, lon: 6.395 }, { lat: 50.384, lon: 6.385 }, { lat: 50.390, lon: 6.413 },
    { lat: 50.369, lon: 6.421 }, { lat: 50.363, lon: 6.430 }, { lat: 50.372, lon: 6.447 }, { lat: 50.361, lon: 6.460 }, { lat: 50.335, lon: 6.452 },
    { lat: 50.338, lon: 6.485 }, { lat: 50.369, lon: 6.529 }, { lat: 50.369, lon: 6.558 }, { lat: 50.388, lon: 6.603 }, { lat: 50.375, lon: 6.604 },
    { lat: 50.373, lon: 6.627 }, { lat: 50.352, lon: 6.624 }, { lat: 50.348, lon: 6.650 }, { lat: 50.372, lon: 6.668 }, { lat: 50.336, lon: 6.699 },
    { lat: 50.364, lon: 6.777 }, { lat: 50.361, lon: 6.800 }, { lat: 50.393, lon: 6.769 }, { lat: 50.421, lon: 6.785 }, { lat: 50.436, lon: 6.771 },
    { lat: 50.436, lon: 6.746 }, { lat: 50.458, lon: 6.767 }, { lat: 50.473, lon: 6.745 }, { lat: 50.491, lon: 6.801 }, { lat: 50.472, lon: 6.812 },
    { lat: 50.456, lon: 6.868 }, { lat: 50.469, lon: 6.902 }, { lat: 50.485, lon: 6.906 }, { lat: 50.502, lon: 6.906 }, { lat: 50.508, lon: 6.888 },
    { lat: 50.518, lon: 6.898 }, { lat: 50.527, lon: 6.882 }, { lat: 50.535, lon: 6.931 }, { lat: 50.565, lon: 6.922 }, { lat: 50.571, lon: 6.935 },
    { lat: 50.579, lon: 6.911 }, { lat: 50.570, lon: 6.899 }, { lat: 50.594, lon: 6.885 }, { lat: 50.606, lon: 6.914 }, { lat: 50.609, lon: 6.904 },
    { lat: 50.629, lon: 6.916 }, { lat: 50.639, lon: 6.873 }, { lat: 50.653, lon: 6.858 }, { lat: 50.674, lon: 6.876 }, { lat: 50.707, lon: 6.857 },
    { lat: 50.714, lon: 6.899 }, { lat: 50.721, lon: 6.893 }, { lat: 50.734, lon: 6.916 }, { lat: 50.750, lon: 6.902 }, { lat: 50.746, lon: 6.881 },
    { lat: 50.763, lon: 6.860 }, { lat: 50.783, lon: 6.870 }, { lat: 50.790, lon: 6.856 }, { lat: 50.783, lon: 6.840 }, { lat: 50.770, lon: 6.845 },
    { lat: 50.764, lon: 6.813 }, { lat: 50.717, lon: 6.778 }, { lat: 50.732, lon: 6.713 }, { lat: 50.754, lon: 6.715 }, { lat: 50.754, lon: 6.694 },
    { lat: 50.731, lon: 6.703 }, { lat: 50.713, lon: 6.679 }, { lat: 50.734, lon: 6.626 }, { lat: 50.714, lon: 6.613 }, { lat: 50.708, lon: 6.589 },
    { lat: 50.673, lon: 6.601 }, { lat: 50.656, lon: 6.567 }, { lat: 50.640, lon: 6.578 }, { lat: 50.627, lon: 6.559 }, { lat: 50.604, lon: 6.559 },
    { lat: 50.600, lon: 6.491 }, { lat: 50.619, lon: 6.421 }, { lat: 50.602, lon: 6.417 }, { lat: 50.597, lon: 6.391 }, { lat: 50.583, lon: 6.394 },
    { lat: 50.561, lon: 6.365 }, { lat: 50.530, lon: 6.358 }, { lat: 50.534, lon: 6.380 }, { lat: 50.519, lon: 6.370 },
    ],
  },
  {
    name: "Kreis Gütersloh",
    outline: [
    { lat: 52.011, lon: 8.076 }, { lat: 51.997, lon: 8.091 }, { lat: 52.001, lon: 8.111 }, { lat: 51.956, lon: 8.113 }, { lat: 51.928, lon: 8.169 },
    { lat: 51.911, lon: 8.170 }, { lat: 51.899, lon: 8.150 }, { lat: 51.900, lon: 8.162 }, { lat: 51.862, lon: 8.185 }, { lat: 51.853, lon: 8.214 },
    { lat: 51.837, lon: 8.218 }, { lat: 51.828, lon: 8.200 }, { lat: 51.823, lon: 8.232 }, { lat: 51.803, lon: 8.257 }, { lat: 51.773, lon: 8.254 },
    { lat: 51.754, lon: 8.302 }, { lat: 51.726, lon: 8.320 }, { lat: 51.719, lon: 8.403 }, { lat: 51.749, lon: 8.409 }, { lat: 51.772, lon: 8.436 },
    { lat: 51.809, lon: 8.520 }, { lat: 51.832, lon: 8.534 }, { lat: 51.862, lon: 8.628 }, { lat: 51.878, lon: 8.638 }, { lat: 51.852, lon: 8.662 },
    { lat: 51.859, lon: 8.748 }, { lat: 51.917, lon: 8.682 }, { lat: 51.930, lon: 8.615 }, { lat: 51.915, lon: 8.545 }, { lat: 51.925, lon: 8.547 },
    { lat: 51.926, lon: 8.533 }, { lat: 51.915, lon: 8.506 }, { lat: 51.945, lon: 8.487 }, { lat: 51.945, lon: 8.427 }, { lat: 51.960, lon: 8.420 },
    { lat: 51.957, lon: 8.396 }, { lat: 51.970, lon: 8.379 }, { lat: 51.975, lon: 8.427 }, { lat: 51.989, lon: 8.451 }, { lat: 52.019, lon: 8.461 },
    { lat: 52.044, lon: 8.421 }, { lat: 52.050, lon: 8.453 }, { lat: 52.067, lon: 8.447 }, { lat: 52.091, lon: 8.473 }, { lat: 52.111, lon: 8.456 },
    { lat: 52.104, lon: 8.431 }, { lat: 52.115, lon: 8.411 }, { lat: 52.109, lon: 8.380 }, { lat: 52.124, lon: 8.343 }, { lat: 52.118, lon: 8.311 },
    { lat: 52.126, lon: 8.285 }, { lat: 52.135, lon: 8.287 }, { lat: 52.132, lon: 8.268 }, { lat: 52.120, lon: 8.263 }, { lat: 52.122, lon: 8.247 },
    { lat: 52.106, lon: 8.220 }, { lat: 52.073, lon: 8.194 }, { lat: 52.076, lon: 8.152 }, { lat: 52.057, lon: 8.096 },
    ],
  },
  {
    name: "Kreis Heinsberg",
    outline: [
    { lat: 51.051, lon: 5.866 }, { lat: 51.018, lon: 5.879 }, { lat: 51.002, lon: 5.906 }, { lat: 50.975, lon: 5.897 }, { lat: 50.988, lon: 5.955 },
    { lat: 50.979, lon: 5.968 }, { lat: 50.983, lon: 6.027 }, { lat: 50.957, lon: 6.005 }, { lat: 50.935, lon: 6.018 }, { lat: 50.921, lon: 6.094 },
    { lat: 50.910, lon: 6.088 }, { lat: 50.911, lon: 6.113 }, { lat: 50.898, lon: 6.137 }, { lat: 50.937, lon: 6.162 }, { lat: 50.953, lon: 6.203 },
    { lat: 50.967, lon: 6.195 }, { lat: 50.997, lon: 6.254 }, { lat: 50.997, lon: 6.273 }, { lat: 51.023, lon: 6.285 }, { lat: 51.013, lon: 6.322 },
    { lat: 51.017, lon: 6.362 }, { lat: 51.034, lon: 6.372 }, { lat: 51.034, lon: 6.431 }, { lat: 51.056, lon: 6.477 }, { lat: 51.062, lon: 6.447 },
    { lat: 51.090, lon: 6.450 }, { lat: 51.086, lon: 6.406 }, { lat: 51.090, lon: 6.385 }, { lat: 51.099, lon: 6.392 }, { lat: 51.096, lon: 6.360 },
    { lat: 51.126, lon: 6.356 }, { lat: 51.152, lon: 6.302 }, { lat: 51.175, lon: 6.293 }, { lat: 51.190, lon: 6.251 }, { lat: 51.167, lon: 6.211 },
    { lat: 51.185, lon: 6.175 }, { lat: 51.173, lon: 6.139 }, { lat: 51.158, lon: 6.175 }, { lat: 51.149, lon: 6.163 }, { lat: 51.135, lon: 6.092 },
    { lat: 51.097, lon: 6.037 }, { lat: 51.091, lon: 6.010 }, { lat: 51.072, lon: 5.980 }, { lat: 51.035, lon: 5.958 }, { lat: 51.035, lon: 5.938 },
    { lat: 51.067, lon: 5.913 },
    ],
  },
  {
    name: "Kreis Herford",
    outline: [
    { lat: 52.124, lon: 8.404 }, { lat: 52.105, lon: 8.428 }, { lat: 52.111, lon: 8.456 }, { lat: 52.101, lon: 8.472 }, { lat: 52.115, lon: 8.509 },
    { lat: 52.102, lon: 8.555 }, { lat: 52.109, lon: 8.560 }, { lat: 52.076, lon: 8.571 }, { lat: 52.088, lon: 8.608 }, { lat: 52.067, lon: 8.617 },
    { lat: 52.058, lon: 8.651 }, { lat: 52.087, lon: 8.667 }, { lat: 52.090, lon: 8.716 }, { lat: 52.122, lon: 8.748 }, { lat: 52.116, lon: 8.793 },
    { lat: 52.127, lon: 8.808 }, { lat: 52.116, lon: 8.810 }, { lat: 52.101, lon: 8.856 }, { lat: 52.111, lon: 8.890 }, { lat: 52.156, lon: 8.898 },
    { lat: 52.185, lon: 8.927 }, { lat: 52.197, lon: 8.900 }, { lat: 52.196, lon: 8.872 }, { lat: 52.187, lon: 8.845 }, { lat: 52.175, lon: 8.839 },
    { lat: 52.179, lon: 8.826 }, { lat: 52.163, lon: 8.778 }, { lat: 52.206, lon: 8.785 }, { lat: 52.215, lon: 8.756 }, { lat: 52.233, lon: 8.752 },
    { lat: 52.252, lon: 8.715 }, { lat: 52.232, lon: 8.684 }, { lat: 52.261, lon: 8.635 }, { lat: 52.253, lon: 8.571 }, { lat: 52.264, lon: 8.529 },
    { lat: 52.260, lon: 8.472 }, { lat: 52.268, lon: 8.466 }, { lat: 52.229, lon: 8.461 }, { lat: 52.213, lon: 8.442 }, { lat: 52.199, lon: 8.455 },
    { lat: 52.185, lon: 8.517 }, { lat: 52.160, lon: 8.481 }, { lat: 52.139, lon: 8.415 },
    ],
  },
  {
    name: "Kreis Höxter",
    outline: [
    { lat: 51.530, lon: 8.904 }, { lat: 51.506, lon: 8.949 }, { lat: 51.519, lon: 9.020 }, { lat: 51.502, lon: 9.039 }, { lat: 51.503, lon: 9.077 },
    { lat: 51.494, lon: 9.092 }, { lat: 51.465, lon: 9.077 }, { lat: 51.443, lon: 9.103 }, { lat: 51.450, lon: 9.136 }, { lat: 51.444, lon: 9.160 },
    { lat: 51.467, lon: 9.185 }, { lat: 51.460, lon: 9.216 }, { lat: 51.490, lon: 9.225 }, { lat: 51.498, lon: 9.264 }, { lat: 51.514, lon: 9.282 },
    { lat: 51.512, lon: 9.309 }, { lat: 51.553, lon: 9.316 }, { lat: 51.591, lon: 9.374 }, { lat: 51.615, lon: 9.337 }, { lat: 51.631, lon: 9.427 },
    { lat: 51.644, lon: 9.445 }, { lat: 51.652, lon: 9.438 }, { lat: 51.650, lon: 9.375 }, { lat: 51.673, lon: 9.397 }, { lat: 51.690, lon: 9.386 },
    { lat: 51.704, lon: 9.402 }, { lat: 51.719, lon: 9.387 }, { lat: 51.732, lon: 9.394 }, { lat: 51.744, lon: 9.375 }, { lat: 51.795, lon: 9.449 },
    { lat: 51.811, lon: 9.427 }, { lat: 51.828, lon: 9.443 }, { lat: 51.841, lon: 9.433 }, { lat: 51.863, lon: 9.459 }, { lat: 51.856, lon: 9.405 },
    { lat: 51.865, lon: 9.362 }, { lat: 51.850, lon: 9.302 }, { lat: 51.865, lon: 9.274 }, { lat: 51.867, lon: 9.243 }, { lat: 51.853, lon: 9.210 },
    { lat: 51.863, lon: 9.161 }, { lat: 51.875, lon: 9.155 }, { lat: 51.868, lon: 9.136 }, { lat: 51.911, lon: 9.128 }, { lat: 51.872, lon: 9.052 },
    { lat: 51.877, lon: 9.012 }, { lat: 51.859, lon: 9.016 }, { lat: 51.836, lon: 8.977 }, { lat: 51.837, lon: 8.953 }, { lat: 51.818, lon: 8.950 },
    { lat: 51.772, lon: 8.970 }, { lat: 51.759, lon: 9.000 }, { lat: 51.734, lon: 8.979 }, { lat: 51.703, lon: 9.000 }, { lat: 51.698, lon: 8.975 },
    { lat: 51.648, lon: 8.988 }, { lat: 51.621, lon: 8.978 }, { lat: 51.601, lon: 8.991 }, { lat: 51.597, lon: 9.013 }, { lat: 51.575, lon: 9.017 },
    { lat: 51.578, lon: 8.999 }, { lat: 51.570, lon: 9.001 }, { lat: 51.545, lon: 8.930 }, { lat: 51.536, lon: 8.935 },
    ],
  },
  {
    name: "Kreis Kleve",
    outline: [
    { lat: 51.824, lon: 5.945 }, { lat: 51.817, lon: 5.958 }, { lat: 51.811, lon: 5.948 }, { lat: 51.798, lon: 5.979 }, { lat: 51.785, lon: 5.975 },
    { lat: 51.783, lon: 5.990 }, { lat: 51.770, lon: 5.992 }, { lat: 51.749, lon: 5.952 }, { lat: 51.738, lon: 5.955 }, { lat: 51.738, lon: 5.994 },
    { lat: 51.717, lon: 6.045 }, { lat: 51.709, lon: 6.026 }, { lat: 51.674, lon: 6.032 }, { lat: 51.656, lon: 6.118 }, { lat: 51.606, lon: 6.091 },
    { lat: 51.567, lon: 6.157 }, { lat: 51.513, lon: 6.212 }, { lat: 51.469, lon: 6.224 }, { lat: 51.400, lon: 6.205 }, { lat: 51.400, lon: 6.227 },
    { lat: 51.390, lon: 6.214 }, { lat: 51.365, lon: 6.224 }, { lat: 51.355, lon: 6.267 }, { lat: 51.360, lon: 6.308 }, { lat: 51.377, lon: 6.332 },
    { lat: 51.376, lon: 6.358 }, { lat: 51.413, lon: 6.398 }, { lat: 51.406, lon: 6.462 }, { lat: 51.419, lon: 6.471 }, { lat: 51.420, lon: 6.507 },
    { lat: 51.438, lon: 6.522 }, { lat: 51.448, lon: 6.503 }, { lat: 51.468, lon: 6.507 }, { lat: 51.483, lon: 6.477 }, { lat: 51.520, lon: 6.449 },
    { lat: 51.529, lon: 6.448 }, { lat: 51.522, lon: 6.480 }, { lat: 51.538, lon: 6.487 }, { lat: 51.552, lon: 6.463 }, { lat: 51.568, lon: 6.498 },
    { lat: 51.576, lon: 6.423 }, { lat: 51.561, lon: 6.407 }, { lat: 51.562, lon: 6.387 }, { lat: 51.570, lon: 6.370 }, { lat: 51.590, lon: 6.375 },
    { lat: 51.604, lon: 6.351 }, { lat: 51.601, lon: 6.325 }, { lat: 51.613, lon: 6.333 }, { lat: 51.622, lon: 6.300 }, { lat: 51.637, lon: 6.292 },
    { lat: 51.645, lon: 6.355 }, { lat: 51.661, lon: 6.354 }, { lat: 51.684, lon: 6.381 }, { lat: 51.703, lon: 6.356 }, { lat: 51.741, lon: 6.411 },
    { lat: 51.755, lon: 6.403 }, { lat: 51.743, lon: 6.422 }, { lat: 51.713, lon: 6.416 }, { lat: 51.702, lon: 6.460 }, { lat: 51.720, lon: 6.489 },
    { lat: 51.754, lon: 6.482 }, { lat: 51.765, lon: 6.534 }, { lat: 51.811, lon: 6.489 }, { lat: 51.805, lon: 6.423 }, { lat: 51.819, lon: 6.427 },
    { lat: 51.835, lon: 6.363 }, { lat: 51.848, lon: 6.357 }, { lat: 51.849, lon: 6.306 }, { lat: 51.868, lon: 6.299 }, { lat: 51.874, lon: 6.278 },
    { lat: 51.869, lon: 6.211 }, { lat: 51.883, lon: 6.184 }, { lat: 51.892, lon: 6.191 }, { lat: 51.905, lon: 6.156 }, { lat: 51.892, lon: 6.103 },
    { lat: 51.886, lon: 6.137 }, { lat: 51.870, lon: 6.145 }, { lat: 51.862, lon: 6.167 }, { lat: 51.841, lon: 6.167 }, { lat: 51.849, lon: 6.101 },
    { lat: 51.865, lon: 6.063 }, { lat: 51.843, lon: 6.036 }, { lat: 51.831, lon: 5.994 }, { lat: 51.837, lon: 5.963 },
    ],
  },
  {
    name: "Kreis Lippe",
    outline: [
    { lat: 51.928, lon: 8.607 }, { lat: 51.917, lon: 8.682 }, { lat: 51.894, lon: 8.717 }, { lat: 51.798, lon: 8.791 }, { lat: 51.799, lon: 8.861 },
    { lat: 51.813, lon: 8.916 }, { lat: 51.808, lon: 8.929 }, { lat: 51.797, lon: 8.923 }, { lat: 51.800, lon: 8.948 }, { lat: 51.789, lon: 8.955 },
    { lat: 51.837, lon: 8.953 }, { lat: 51.844, lon: 8.996 }, { lat: 51.860, lon: 9.016 }, { lat: 51.877, lon: 9.012 }, { lat: 51.872, lon: 9.052 },
    { lat: 51.911, lon: 9.126 }, { lat: 51.909, lon: 9.136 }, { lat: 51.899, lon: 9.123 }, { lat: 51.892, lon: 9.137 }, { lat: 51.868, lon: 9.136 },
    { lat: 51.875, lon: 9.155 }, { lat: 51.863, lon: 9.161 }, { lat: 51.852, lon: 9.214 }, { lat: 51.864, lon: 9.220 }, { lat: 51.867, lon: 9.243 },
    { lat: 51.865, lon: 9.274 }, { lat: 51.850, lon: 9.299 }, { lat: 51.855, lon: 9.332 }, { lat: 51.890, lon: 9.346 }, { lat: 51.917, lon: 9.332 },
    { lat: 51.930, lon: 9.274 }, { lat: 51.944, lon: 9.277 }, { lat: 51.947, lon: 9.263 }, { lat: 51.957, lon: 9.286 }, { lat: 51.974, lon: 9.274 },
    { lat: 51.974, lon: 9.217 }, { lat: 51.960, lon: 9.209 }, { lat: 51.966, lon: 9.186 }, { lat: 51.983, lon: 9.175 }, { lat: 51.997, lon: 9.197 },
    { lat: 52.003, lon: 9.179 }, { lat: 52.013, lon: 9.197 }, { lat: 52.048, lon: 9.172 }, { lat: 52.070, lon: 9.194 }, { lat: 52.098, lon: 9.155 },
    { lat: 52.094, lon: 9.134 }, { lat: 52.119, lon: 9.159 }, { lat: 52.129, lon: 9.154 }, { lat: 52.140, lon: 9.130 }, { lat: 52.135, lon: 9.088 },
    { lat: 52.140, lon: 9.068 }, { lat: 52.150, lon: 9.067 }, { lat: 52.133, lon: 9.018 }, { lat: 52.172, lon: 9.022 }, { lat: 52.195, lon: 8.986 },
    { lat: 52.181, lon: 8.988 }, { lat: 52.185, lon: 8.929 }, { lat: 52.169, lon: 8.907 }, { lat: 52.135, lon: 8.892 }, { lat: 52.128, lon: 8.902 },
    { lat: 52.105, lon: 8.874 }, { lat: 52.103, lon: 8.841 }, { lat: 52.116, lon: 8.810 }, { lat: 52.127, lon: 8.808 }, { lat: 52.116, lon: 8.793 },
    { lat: 52.122, lon: 8.748 }, { lat: 52.090, lon: 8.716 }, { lat: 52.087, lon: 8.667 }, { lat: 52.063, lon: 8.653 }, { lat: 52.039, lon: 8.661 },
    { lat: 52.027, lon: 8.642 }, { lat: 52.012, lon: 8.662 }, { lat: 51.967, lon: 8.641 }, { lat: 51.959, lon: 8.650 },
    ],
  },
  {
    name: "Kreis Mettmann",
    outline: [
    { lat: 51.301, lon: 6.801 }, { lat: 51.280, lon: 6.803 }, { lat: 51.275, lon: 6.819 }, { lat: 51.279, lon: 6.851 }, { lat: 51.265, lon: 6.896 },
    { lat: 51.276, lon: 6.913 }, { lat: 51.273, lon: 6.940 }, { lat: 51.266, lon: 6.928 }, { lat: 51.238, lon: 6.931 }, { lat: 51.241, lon: 6.871 },
    { lat: 51.214, lon: 6.879 }, { lat: 51.211, lon: 6.911 }, { lat: 51.201, lon: 6.905 }, { lat: 51.193, lon: 6.921 }, { lat: 51.159, lon: 6.891 },
    { lat: 51.137, lon: 6.925 }, { lat: 51.124, lon: 6.899 }, { lat: 51.131, lon: 6.858 }, { lat: 51.104, lon: 6.883 }, { lat: 51.081, lon: 6.853 },
    { lat: 51.065, lon: 6.898 }, { lat: 51.082, lon: 6.922 }, { lat: 51.067, lon: 6.974 }, { lat: 51.074, lon: 6.988 }, { lat: 51.134, lon: 6.998 },
    { lat: 51.145, lon: 6.994 }, { lat: 51.147, lon: 6.951 }, { lat: 51.157, lon: 6.955 }, { lat: 51.189, lon: 7.030 }, { lat: 51.209, lon: 7.048 },
    { lat: 51.217, lon: 7.035 }, { lat: 51.232, lon: 7.052 }, { lat: 51.228, lon: 7.041 }, { lat: 51.248, lon: 7.016 }, { lat: 51.258, lon: 7.062 },
    { lat: 51.280, lon: 7.081 }, { lat: 51.283, lon: 7.098 }, { lat: 51.302, lon: 7.105 }, { lat: 51.313, lon: 7.167 }, { lat: 51.340, lon: 7.145 },
    { lat: 51.375, lon: 7.153 }, { lat: 51.381, lon: 7.117 }, { lat: 51.370, lon: 7.099 }, { lat: 51.365, lon: 7.017 }, { lat: 51.348, lon: 6.964 },
    { lat: 51.348, lon: 6.926 }, { lat: 51.372, lon: 6.890 }, { lat: 51.363, lon: 6.878 }, { lat: 51.365, lon: 6.846 }, { lat: 51.355, lon: 6.845 },
    { lat: 51.350, lon: 6.806 }, { lat: 51.328, lon: 6.803 }, { lat: 51.321, lon: 6.817 },
    ],
  },
  {
    name: "Kreis Minden-Lübbecke",
    outline: [
    { lat: 52.456, lon: 8.297 }, { lat: 52.434, lon: 8.304 }, { lat: 52.426, lon: 8.322 }, { lat: 52.409, lon: 8.323 }, { lat: 52.407, lon: 8.312 },
    { lat: 52.361, lon: 8.442 }, { lat: 52.316, lon: 8.471 }, { lat: 52.303, lon: 8.458 }, { lat: 52.260, lon: 8.472 }, { lat: 52.264, lon: 8.529 },
    { lat: 52.253, lon: 8.577 }, { lat: 52.261, lon: 8.635 }, { lat: 52.232, lon: 8.684 }, { lat: 52.252, lon: 8.715 }, { lat: 52.233, lon: 8.752 },
    { lat: 52.215, lon: 8.756 }, { lat: 52.206, lon: 8.785 }, { lat: 52.180, lon: 8.784 }, { lat: 52.170, lon: 8.770 }, { lat: 52.162, lon: 8.782 },
    { lat: 52.179, lon: 8.826 }, { lat: 52.175, lon: 8.839 }, { lat: 52.187, lon: 8.845 }, { lat: 52.196, lon: 8.872 }, { lat: 52.181, lon: 8.984 },
    { lat: 52.195, lon: 8.987 }, { lat: 52.195, lon: 9.014 }, { lat: 52.183, lon: 9.022 }, { lat: 52.183, lon: 9.046 }, { lat: 52.224, lon: 9.037 },
    { lat: 52.221, lon: 9.053 }, { lat: 52.234, lon: 9.077 }, { lat: 52.263, lon: 8.975 }, { lat: 52.275, lon: 8.979 }, { lat: 52.279, lon: 8.963 },
    { lat: 52.287, lon: 8.988 }, { lat: 52.326, lon: 8.998 }, { lat: 52.346, lon: 9.028 }, { lat: 52.339, lon: 9.060 }, { lat: 52.403, lon: 9.123 },
    { lat: 52.423, lon: 9.124 }, { lat: 52.422, lon: 9.110 }, { lat: 52.443, lon: 9.095 }, { lat: 52.475, lon: 9.124 }, { lat: 52.475, lon: 9.138 },
    { lat: 52.497, lon: 9.099 }, { lat: 52.500, lon: 9.053 }, { lat: 52.460, lon: 9.017 }, { lat: 52.451, lon: 8.978 }, { lat: 52.432, lon: 8.987 },
    { lat: 52.415, lon: 8.940 }, { lat: 52.402, lon: 8.937 }, { lat: 52.406, lon: 8.893 }, { lat: 52.396, lon: 8.889 }, { lat: 52.389, lon: 8.853 },
    { lat: 52.399, lon: 8.788 }, { lat: 52.388, lon: 8.747 }, { lat: 52.401, lon: 8.725 }, { lat: 52.395, lon: 8.706 }, { lat: 52.429, lon: 8.718 },
    { lat: 52.444, lon: 8.703 }, { lat: 52.503, lon: 8.702 }, { lat: 52.519, lon: 8.690 }, { lat: 52.517, lon: 8.671 }, { lat: 52.531, lon: 8.652 },
    { lat: 52.499, lon: 8.557 }, { lat: 52.515, lon: 8.509 }, { lat: 52.492, lon: 8.459 }, { lat: 52.461, lon: 8.454 }, { lat: 52.445, lon: 8.418 },
    { lat: 52.451, lon: 8.400 }, { lat: 52.443, lon: 8.363 },
    ],
  },
  {
    name: "Kreis Olpe",
    outline: [
    { lat: 51.062, lon: 7.702 }, { lat: 51.040, lon: 7.731 }, { lat: 50.997, lon: 7.726 }, { lat: 50.978, lon: 7.749 }, { lat: 50.980, lon: 7.781 },
    { lat: 50.940, lon: 7.786 }, { lat: 50.940, lon: 7.813 }, { lat: 50.925, lon: 7.850 }, { lat: 50.925, lon: 7.911 }, { lat: 50.934, lon: 7.925 },
    { lat: 50.960, lon: 7.923 }, { lat: 50.968, lon: 7.940 }, { lat: 50.994, lon: 7.933 }, { lat: 51.028, lon: 7.951 }, { lat: 51.042, lon: 8.022 },
    { lat: 51.023, lon: 8.021 }, { lat: 51.005, lon: 8.042 }, { lat: 51.008, lon: 8.070 }, { lat: 51.023, lon: 8.080 }, { lat: 51.025, lon: 8.097 },
    { lat: 51.024, lon: 8.127 }, { lat: 51.006, lon: 8.168 }, { lat: 51.020, lon: 8.175 }, { lat: 51.022, lon: 8.214 }, { lat: 51.055, lon: 8.245 },
    { lat: 51.090, lon: 8.220 }, { lat: 51.112, lon: 8.242 }, { lat: 51.124, lon: 8.219 }, { lat: 51.122, lon: 8.195 }, { lat: 51.146, lon: 8.184 },
    { lat: 51.147, lon: 8.168 }, { lat: 51.137, lon: 8.161 }, { lat: 51.143, lon: 8.131 }, { lat: 51.173, lon: 8.151 }, { lat: 51.205, lon: 8.104 },
    { lat: 51.241, lon: 8.118 }, { lat: 51.248, lon: 8.054 }, { lat: 51.237, lon: 8.044 }, { lat: 51.247, lon: 8.019 }, { lat: 51.235, lon: 7.996 },
    { lat: 51.240, lon: 7.941 }, { lat: 51.220, lon: 7.951 }, { lat: 51.209, lon: 7.926 }, { lat: 51.176, lon: 7.949 }, { lat: 51.170, lon: 7.928 },
    { lat: 51.183, lon: 7.909 }, { lat: 51.166, lon: 7.900 }, { lat: 51.165, lon: 7.830 }, { lat: 51.147, lon: 7.796 }, { lat: 51.126, lon: 7.839 },
    { lat: 51.109, lon: 7.819 }, { lat: 51.075, lon: 7.821 }, { lat: 51.074, lon: 7.722 },
    ],
  },
  {
    name: "Kreis Paderborn",
    outline: [
    { lat: 51.720, lon: 8.403 }, { lat: 51.724, lon: 8.462 }, { lat: 51.715, lon: 8.477 }, { lat: 51.684, lon: 8.478 }, { lat: 51.659, lon: 8.573 },
    { lat: 51.617, lon: 8.587 }, { lat: 51.595, lon: 8.511 }, { lat: 51.585, lon: 8.507 }, { lat: 51.587, lon: 8.488 }, { lat: 51.564, lon: 8.473 },
    { lat: 51.533, lon: 8.487 }, { lat: 51.530, lon: 8.512 }, { lat: 51.491, lon: 8.520 }, { lat: 51.468, lon: 8.548 }, { lat: 51.468, lon: 8.573 },
    { lat: 51.485, lon: 8.604 }, { lat: 51.481, lon: 8.654 }, { lat: 51.459, lon: 8.721 }, { lat: 51.466, lon: 8.752 }, { lat: 51.447, lon: 8.768 },
    { lat: 51.496, lon: 8.837 }, { lat: 51.527, lon: 8.806 }, { lat: 51.540, lon: 8.815 }, { lat: 51.548, lon: 8.886 }, { lat: 51.529, lon: 8.896 },
    { lat: 51.536, lon: 8.935 }, { lat: 51.545, lon: 8.930 }, { lat: 51.552, lon: 8.959 }, { lat: 51.561, lon: 8.958 }, { lat: 51.570, lon: 9.001 },
    { lat: 51.578, lon: 8.999 }, { lat: 51.575, lon: 9.017 }, { lat: 51.597, lon: 9.013 }, { lat: 51.601, lon: 8.991 }, { lat: 51.621, lon: 8.978 },
    { lat: 51.648, lon: 8.988 }, { lat: 51.698, lon: 8.975 }, { lat: 51.703, lon: 9.000 }, { lat: 51.734, lon: 8.979 }, { lat: 51.759, lon: 9.000 },
    { lat: 51.770, lon: 8.972 }, { lat: 51.800, lon: 8.948 }, { lat: 51.797, lon: 8.923 }, { lat: 51.808, lon: 8.929 }, { lat: 51.813, lon: 8.916 },
    { lat: 51.799, lon: 8.861 }, { lat: 51.798, lon: 8.791 }, { lat: 51.859, lon: 8.748 }, { lat: 51.852, lon: 8.662 }, { lat: 51.878, lon: 8.638 },
    { lat: 51.862, lon: 8.628 }, { lat: 51.832, lon: 8.534 }, { lat: 51.809, lon: 8.520 }, { lat: 51.772, lon: 8.436 }, { lat: 51.749, lon: 8.409 },
    ],
  },
  {
    name: "Kreis Recklinghausen",
    outline: [
    { lat: 51.653, lon: 6.894 }, { lat: 51.636, lon: 6.902 }, { lat: 51.645, lon: 6.932 }, { lat: 51.626, lon: 6.984 }, { lat: 51.607, lon: 6.980 },
    { lat: 51.585, lon: 6.930 }, { lat: 51.563, lon: 6.922 }, { lat: 51.533, lon: 7.008 }, { lat: 51.547, lon: 7.032 }, { lat: 51.564, lon: 7.013 },
    { lat: 51.587, lon: 7.013 }, { lat: 51.594, lon: 6.994 }, { lat: 51.620, lon: 6.998 }, { lat: 51.623, lon: 6.987 }, { lat: 51.632, lon: 7.022 },
    { lat: 51.615, lon: 7.068 }, { lat: 51.588, lon: 7.076 }, { lat: 51.594, lon: 7.105 }, { lat: 51.586, lon: 7.122 }, { lat: 51.552, lon: 7.145 },
    { lat: 51.551, lon: 7.175 }, { lat: 51.573, lon: 7.243 }, { lat: 51.556, lon: 7.283 }, { lat: 51.530, lon: 7.296 }, { lat: 51.520, lon: 7.335 },
    { lat: 51.528, lon: 7.364 }, { lat: 51.577, lon: 7.339 }, { lat: 51.608, lon: 7.449 }, { lat: 51.630, lon: 7.465 }, { lat: 51.660, lon: 7.443 },
    { lat: 51.687, lon: 7.340 }, { lat: 51.699, lon: 7.345 }, { lat: 51.703, lon: 7.309 }, { lat: 51.711, lon: 7.311 }, { lat: 51.706, lon: 7.299 },
    { lat: 51.737, lon: 7.321 }, { lat: 51.749, lon: 7.280 }, { lat: 51.773, lon: 7.259 }, { lat: 51.780, lon: 7.272 }, { lat: 51.800, lon: 7.260 },
    { lat: 51.821, lon: 7.191 }, { lat: 51.820, lon: 7.168 }, { lat: 51.777, lon: 7.075 }, { lat: 51.784, lon: 7.030 }, { lat: 51.800, lon: 7.020 },
    { lat: 51.801, lon: 6.995 }, { lat: 51.799, lon: 6.977 }, { lat: 51.772, lon: 6.956 }, { lat: 51.779, lon: 6.916 }, { lat: 51.748, lon: 6.909 },
    { lat: 51.715, lon: 6.941 }, { lat: 51.703, lon: 6.937 }, { lat: 51.700, lon: 6.915 },
    ],
  },
  {
    name: "Kreis Siegen-Wittgenstein",
    outline: [
    { lat: 50.887, lon: 7.827 }, { lat: 50.874, lon: 7.882 }, { lat: 50.847, lon: 7.909 }, { lat: 50.844, lon: 7.967 }, { lat: 50.833, lon: 7.978 },
    { lat: 50.774, lon: 7.969 }, { lat: 50.727, lon: 8.040 }, { lat: 50.697, lon: 8.039 }, { lat: 50.695, lon: 8.060 }, { lat: 50.707, lon: 8.079 },
    { lat: 50.686, lon: 8.126 }, { lat: 50.736, lon: 8.167 }, { lat: 50.788, lon: 8.126 }, { lat: 50.803, lon: 8.165 }, { lat: 50.883, lon: 8.270 },
    { lat: 50.882, lon: 8.292 }, { lat: 50.861, lon: 8.305 }, { lat: 50.861, lon: 8.358 }, { lat: 50.876, lon: 8.385 }, { lat: 50.892, lon: 8.387 },
    { lat: 50.918, lon: 8.434 }, { lat: 50.920, lon: 8.460 }, { lat: 50.966, lon: 8.458 }, { lat: 50.969, lon: 8.478 }, { lat: 51.009, lon: 8.513 },
    { lat: 51.020, lon: 8.538 }, { lat: 51.043, lon: 8.521 }, { lat: 51.041, lon: 8.504 }, { lat: 51.063, lon: 8.527 }, { lat: 51.079, lon: 8.502 },
    { lat: 51.096, lon: 8.543 }, { lat: 51.114, lon: 8.546 }, { lat: 51.126, lon: 8.507 }, { lat: 51.150, lon: 8.485 }, { lat: 51.135, lon: 8.455 },
    { lat: 51.142, lon: 8.438 }, { lat: 51.133, lon: 8.405 }, { lat: 51.093, lon: 8.341 }, { lat: 51.104, lon: 8.238 }, { lat: 51.090, lon: 8.220 },
    { lat: 51.055, lon: 8.245 }, { lat: 51.022, lon: 8.214 }, { lat: 51.020, lon: 8.175 }, { lat: 51.006, lon: 8.168 }, { lat: 51.024, lon: 8.127 },
    { lat: 51.025, lon: 8.097 }, { lat: 51.023, lon: 8.080 }, { lat: 51.008, lon: 8.070 }, { lat: 51.005, lon: 8.042 }, { lat: 51.023, lon: 8.021 },
    { lat: 51.042, lon: 8.022 }, { lat: 51.032, lon: 8.003 }, { lat: 51.029, lon: 7.955 }, { lat: 51.003, lon: 7.935 }, { lat: 50.968, lon: 7.940 },
    { lat: 50.959, lon: 7.923 }, { lat: 50.934, lon: 7.925 }, { lat: 50.925, lon: 7.911 }, { lat: 50.925, lon: 7.851 },
    ],
  },
  {
    name: "Kreis Soest",
    outline: [
    { lat: 51.579, lon: 7.827 }, { lat: 51.553, lon: 7.843 }, { lat: 51.505, lon: 7.832 }, { lat: 51.486, lon: 7.850 }, { lat: 51.478, lon: 7.838 },
    { lat: 51.459, lon: 7.857 }, { lat: 51.491, lon: 7.908 }, { lat: 51.474, lon: 7.920 }, { lat: 51.466, lon: 7.954 }, { lat: 51.475, lon: 8.003 },
    { lat: 51.447, lon: 8.051 }, { lat: 51.442, lon: 8.158 }, { lat: 51.408, lon: 8.214 }, { lat: 51.407, lon: 8.276 }, { lat: 51.389, lon: 8.298 },
    { lat: 51.396, lon: 8.365 }, { lat: 51.408, lon: 8.392 }, { lat: 51.406, lon: 8.418 }, { lat: 51.441, lon: 8.471 }, { lat: 51.468, lon: 8.548 },
    { lat: 51.491, lon: 8.520 }, { lat: 51.530, lon: 8.512 }, { lat: 51.533, lon: 8.487 }, { lat: 51.574, lon: 8.474 }, { lat: 51.587, lon: 8.488 },
    { lat: 51.585, lon: 8.507 }, { lat: 51.595, lon: 8.511 }, { lat: 51.617, lon: 8.587 }, { lat: 51.659, lon: 8.573 }, { lat: 51.684, lon: 8.478 },
    { lat: 51.715, lon: 8.477 }, { lat: 51.724, lon: 8.462 }, { lat: 51.717, lon: 8.385 }, { lat: 51.728, lon: 8.325 }, { lat: 51.677, lon: 8.295 },
    { lat: 51.658, lon: 8.219 }, { lat: 51.662, lon: 8.195 }, { lat: 51.698, lon: 8.211 }, { lat: 51.694, lon: 8.184 }, { lat: 51.718, lon: 8.119 },
    { lat: 51.702, lon: 8.099 }, { lat: 51.716, lon: 8.056 }, { lat: 51.710, lon: 8.007 }, { lat: 51.723, lon: 7.975 }, { lat: 51.700, lon: 7.945 },
    { lat: 51.672, lon: 7.996 }, { lat: 51.673, lon: 7.953 }, { lat: 51.642, lon: 7.949 }, { lat: 51.614, lon: 7.911 }, { lat: 51.596, lon: 7.914 },
    { lat: 51.595, lon: 7.870 },
    ],
  },
  {
    name: "Kreis Steinfurt",
    outline: [
    { lat: 52.203, lon: 7.095 }, { lat: 52.166, lon: 7.151 }, { lat: 52.155, lon: 7.135 }, { lat: 52.136, lon: 7.151 }, { lat: 52.116, lon: 7.217 },
    { lat: 52.120, lon: 7.251 }, { lat: 52.098, lon: 7.269 }, { lat: 52.058, lon: 7.267 }, { lat: 52.062, lon: 7.288 }, { lat: 52.045, lon: 7.303 },
    { lat: 52.027, lon: 7.374 }, { lat: 52.039, lon: 7.398 }, { lat: 52.033, lon: 7.410 }, { lat: 52.040, lon: 7.411 }, { lat: 52.024, lon: 7.434 },
    { lat: 52.002, lon: 7.432 }, { lat: 52.006, lon: 7.454 }, { lat: 51.995, lon: 7.475 }, { lat: 51.999, lon: 7.520 }, { lat: 52.012, lon: 7.514 },
    { lat: 52.020, lon: 7.534 }, { lat: 52.033, lon: 7.531 }, { lat: 52.060, lon: 7.599 }, { lat: 52.041, lon: 7.631 }, { lat: 52.053, lon: 7.649 },
    { lat: 52.033, lon: 7.686 }, { lat: 52.035, lon: 7.704 }, { lat: 52.098, lon: 7.756 }, { lat: 52.104, lon: 7.797 }, { lat: 52.083, lon: 7.885 },
    { lat: 52.116, lon: 7.972 }, { lat: 52.115, lon: 8.008 }, { lat: 52.154, lon: 7.997 }, { lat: 52.164, lon: 8.025 }, { lat: 52.176, lon: 8.007 },
    { lat: 52.177, lon: 7.934 }, { lat: 52.199, lon: 7.902 }, { lat: 52.225, lon: 7.926 }, { lat: 52.262, lon: 7.924 }, { lat: 52.273, lon: 7.957 },
    { lat: 52.286, lon: 7.931 }, { lat: 52.302, lon: 7.932 }, { lat: 52.307, lon: 7.991 }, { lat: 52.335, lon: 7.949 }, { lat: 52.365, lon: 7.937 },
    { lat: 52.381, lon: 7.892 }, { lat: 52.369, lon: 7.843 }, { lat: 52.372, lon: 7.807 }, { lat: 52.401, lon: 7.714 }, { lat: 52.458, lon: 7.683 },
    { lat: 52.475, lon: 7.604 }, { lat: 52.432, lon: 7.564 }, { lat: 52.421, lon: 7.604 }, { lat: 52.404, lon: 7.583 }, { lat: 52.380, lon: 7.572 },
    { lat: 52.377, lon: 7.582 }, { lat: 52.361, lon: 7.505 }, { lat: 52.333, lon: 7.438 }, { lat: 52.314, lon: 7.426 }, { lat: 52.309, lon: 7.386 },
    { lat: 52.288, lon: 7.362 }, { lat: 52.280, lon: 7.317 }, { lat: 52.264, lon: 7.298 }, { lat: 52.261, lon: 7.121 }, { lat: 52.239, lon: 7.097 },
    ],
  },
  {
    name: "Kreis Unna",
    outline: [
    { lat: 51.669, lon: 7.409 }, { lat: 51.660, lon: 7.444 }, { lat: 51.630, lon: 7.465 }, { lat: 51.612, lon: 7.456 }, { lat: 51.600, lon: 7.419 },
    { lat: 51.585, lon: 7.418 }, { lat: 51.580, lon: 7.446 }, { lat: 51.593, lon: 7.491 }, { lat: 51.579, lon: 7.503 }, { lat: 51.583, lon: 7.590 },
    { lat: 51.549, lon: 7.608 }, { lat: 51.550, lon: 7.633 }, { lat: 51.519, lon: 7.633 }, { lat: 51.508, lon: 7.596 }, { lat: 51.480, lon: 7.610 },
    { lat: 51.464, lon: 7.585 }, { lat: 51.475, lon: 7.572 }, { lat: 51.466, lon: 7.546 }, { lat: 51.455, lon: 7.553 }, { lat: 51.435, lon: 7.532 },
    { lat: 51.427, lon: 7.505 }, { lat: 51.414, lon: 7.506 }, { lat: 51.405, lon: 7.535 }, { lat: 51.396, lon: 7.531 }, { lat: 51.396, lon: 7.597 },
    { lat: 51.385, lon: 7.613 }, { lat: 51.407, lon: 7.632 }, { lat: 51.419, lon: 7.616 }, { lat: 51.423, lon: 7.631 }, { lat: 51.447, lon: 7.613 },
    { lat: 51.466, lon: 7.656 }, { lat: 51.474, lon: 7.699 }, { lat: 51.468, lon: 7.798 }, { lat: 51.480, lon: 7.849 }, { lat: 51.505, lon: 7.832 },
    { lat: 51.553, lon: 7.843 }, { lat: 51.590, lon: 7.814 }, { lat: 51.622, lon: 7.811 }, { lat: 51.627, lon: 7.728 }, { lat: 51.613, lon: 7.716 },
    { lat: 51.613, lon: 7.690 }, { lat: 51.662, lon: 7.676 }, { lat: 51.676, lon: 7.729 }, { lat: 51.693, lon: 7.702 }, { lat: 51.711, lon: 7.705 },
    { lat: 51.729, lon: 7.687 }, { lat: 51.706, lon: 7.652 }, { lat: 51.716, lon: 7.614 }, { lat: 51.685, lon: 7.542 }, { lat: 51.721, lon: 7.517 },
    { lat: 51.714, lon: 7.484 }, { lat: 51.736, lon: 7.467 }, { lat: 51.715, lon: 7.424 }, { lat: 51.690, lon: 7.452 }, { lat: 51.676, lon: 7.449 },
    ],
  },
  {
    name: "Kreis Viersen",
    outline: [
    { lat: 51.221, lon: 6.068 }, { lat: 51.172, lon: 6.082 }, { lat: 51.170, lon: 6.100 }, { lat: 51.194, lon: 6.165 }, { lat: 51.167, lon: 6.211 },
    { lat: 51.190, lon: 6.251 }, { lat: 51.175, lon: 6.282 }, { lat: 51.179, lon: 6.315 }, { lat: 51.225, lon: 6.330 }, { lat: 51.229, lon: 6.361 },
    { lat: 51.218, lon: 6.372 }, { lat: 51.219, lon: 6.412 }, { lat: 51.248, lon: 6.458 }, { lat: 51.223, lon: 6.530 }, { lat: 51.231, lon: 6.536 },
    { lat: 51.229, lon: 6.562 }, { lat: 51.241, lon: 6.568 }, { lat: 51.250, lon: 6.626 }, { lat: 51.263, lon: 6.611 }, { lat: 51.262, lon: 6.596 },
    { lat: 51.287, lon: 6.585 }, { lat: 51.287, lon: 6.516 }, { lat: 51.301, lon: 6.490 }, { lat: 51.310, lon: 6.512 }, { lat: 51.329, lon: 6.516 },
    { lat: 51.346, lon: 6.486 }, { lat: 51.392, lon: 6.479 }, { lat: 51.402, lon: 6.492 }, { lat: 51.400, lon: 6.528 }, { lat: 51.424, lon: 6.525 },
    { lat: 51.419, lon: 6.471 }, { lat: 51.406, lon: 6.462 }, { lat: 51.413, lon: 6.398 }, { lat: 51.376, lon: 6.358 }, { lat: 51.377, lon: 6.332 },
    { lat: 51.360, lon: 6.308 }, { lat: 51.355, lon: 6.267 }, { lat: 51.365, lon: 6.224 }, { lat: 51.335, lon: 6.194 }, { lat: 51.333, lon: 6.169 },
    { lat: 51.275, lon: 6.124 }, { lat: 51.243, lon: 6.073 }, { lat: 51.223, lon: 6.086 },
    ],
  },
  {
    name: "Kreis Warendorf",
    outline: [
    { lat: 51.840, lon: 7.611 }, { lat: 51.818, lon: 7.672 }, { lat: 51.750, lon: 7.713 }, { lat: 51.751, lon: 7.730 }, { lat: 51.724, lon: 7.769 },
    { lat: 51.745, lon: 7.831 }, { lat: 51.730, lon: 7.835 }, { lat: 51.728, lon: 7.876 }, { lat: 51.703, lon: 7.890 }, { lat: 51.701, lon: 7.951 },
    { lat: 51.723, lon: 7.975 }, { lat: 51.710, lon: 8.007 }, { lat: 51.716, lon: 8.056 }, { lat: 51.702, lon: 8.099 }, { lat: 51.718, lon: 8.120 },
    { lat: 51.694, lon: 8.184 }, { lat: 51.698, lon: 8.211 }, { lat: 51.662, lon: 8.195 }, { lat: 51.658, lon: 8.205 }, { lat: 51.660, lon: 8.251 },
    { lat: 51.677, lon: 8.296 }, { lat: 51.726, lon: 8.320 }, { lat: 51.754, lon: 8.302 }, { lat: 51.773, lon: 8.254 }, { lat: 51.803, lon: 8.257 },
    { lat: 51.823, lon: 8.232 }, { lat: 51.828, lon: 8.200 }, { lat: 51.837, lon: 8.218 }, { lat: 51.853, lon: 8.214 }, { lat: 51.862, lon: 8.185 },
    { lat: 51.900, lon: 8.162 }, { lat: 51.898, lon: 8.151 }, { lat: 51.911, lon: 8.170 }, { lat: 51.928, lon: 8.169 }, { lat: 51.956, lon: 8.113 },
    { lat: 52.001, lon: 8.111 }, { lat: 51.997, lon: 8.091 }, { lat: 52.011, lon: 8.076 }, { lat: 52.063, lon: 8.093 }, { lat: 52.068, lon: 8.030 },
    { lat: 52.036, lon: 7.981 }, { lat: 52.052, lon: 7.917 }, { lat: 52.083, lon: 7.889 }, { lat: 52.095, lon: 7.851 }, { lat: 52.094, lon: 7.816 },
    { lat: 52.104, lon: 7.796 }, { lat: 52.097, lon: 7.752 }, { lat: 52.036, lon: 7.704 }, { lat: 52.032, lon: 7.721 }, { lat: 51.998, lon: 7.747 },
    { lat: 51.983, lon: 7.729 }, { lat: 51.968, lon: 7.734 }, { lat: 51.920, lon: 7.774 }, { lat: 51.912, lon: 7.757 }, { lat: 51.898, lon: 7.758 },
    { lat: 51.908, lon: 7.705 }, { lat: 51.902, lon: 7.687 }, { lat: 51.875, lon: 7.710 }, { lat: 51.869, lon: 7.700 }, { lat: 51.879, lon: 7.651 },
    { lat: 51.868, lon: 7.637 }, { lat: 51.861, lon: 7.647 }, { lat: 51.857, lon: 7.616 },
    ],
  },
  {
    name: "Kreis Wesel",
    outline: [
    { lat: 51.637, lon: 6.292 }, { lat: 51.622, lon: 6.300 }, { lat: 51.613, lon: 6.333 }, { lat: 51.601, lon: 6.325 }, { lat: 51.604, lon: 6.351 },
    { lat: 51.590, lon: 6.375 }, { lat: 51.570, lon: 6.370 }, { lat: 51.562, lon: 6.387 }, { lat: 51.561, lon: 6.407 }, { lat: 51.576, lon: 6.423 },
    { lat: 51.568, lon: 6.498 }, { lat: 51.552, lon: 6.463 }, { lat: 51.538, lon: 6.487 }, { lat: 51.522, lon: 6.480 }, { lat: 51.529, lon: 6.448 },
    { lat: 51.520, lon: 6.449 }, { lat: 51.483, lon: 6.477 }, { lat: 51.468, lon: 6.507 }, { lat: 51.427, lon: 6.515 }, { lat: 51.390, lon: 6.558 },
    { lat: 51.397, lon: 6.608 }, { lat: 51.391, lon: 6.636 }, { lat: 51.420, lon: 6.629 }, { lat: 51.409, lon: 6.665 }, { lat: 51.452, lon: 6.679 },
    { lat: 51.474, lon: 6.667 }, { lat: 51.474, lon: 6.655 }, { lat: 51.484, lon: 6.666 }, { lat: 51.489, lon: 6.653 }, { lat: 51.481, lon: 6.643 },
    { lat: 51.504, lon: 6.628 }, { lat: 51.519, lon: 6.697 }, { lat: 51.538, lon: 6.677 }, { lat: 51.560, lon: 6.686 }, { lat: 51.536, lon: 6.747 },
    { lat: 51.533, lon: 6.784 }, { lat: 51.550, lon: 6.787 }, { lat: 51.565, lon: 6.822 }, { lat: 51.574, lon: 6.814 }, { lat: 51.596, lon: 6.866 },
    { lat: 51.608, lon: 6.851 }, { lat: 51.622, lon: 6.871 }, { lat: 51.630, lon: 6.866 }, { lat: 51.636, lon: 6.902 }, { lat: 51.675, lon: 6.901 },
    { lat: 51.715, lon: 6.941 }, { lat: 51.746, lon: 6.911 }, { lat: 51.729, lon: 6.858 }, { lat: 51.737, lon: 6.849 }, { lat: 51.730, lon: 6.828 },
    { lat: 51.743, lon: 6.819 }, { lat: 51.746, lon: 6.772 }, { lat: 51.776, lon: 6.758 }, { lat: 51.768, lon: 6.722 }, { lat: 51.772, lon: 6.708 },
    { lat: 51.781, lon: 6.714 }, { lat: 51.777, lon: 6.668 }, { lat: 51.798, lon: 6.639 }, { lat: 51.794, lon: 6.609 }, { lat: 51.802, lon: 6.593 },
    { lat: 51.790, lon: 6.569 }, { lat: 51.817, lon: 6.518 }, { lat: 51.811, lon: 6.489 }, { lat: 51.765, lon: 6.534 }, { lat: 51.754, lon: 6.482 },
    { lat: 51.720, lon: 6.489 }, { lat: 51.702, lon: 6.460 }, { lat: 51.713, lon: 6.416 }, { lat: 51.743, lon: 6.422 }, { lat: 51.755, lon: 6.403 },
    { lat: 51.741, lon: 6.411 }, { lat: 51.703, lon: 6.356 }, { lat: 51.684, lon: 6.381 }, { lat: 51.661, lon: 6.354 }, { lat: 51.645, lon: 6.355 },
    ],
  },
  {
    name: "Leverkusen",
    outline: [
    { lat: 51.065, lon: 6.898 }, { lat: 51.031, lon: 6.965 }, { lat: 51.011, lon: 6.976 }, { lat: 51.023, lon: 7.009 }, { lat: 51.016, lon: 7.022 },
    { lat: 51.026, lon: 7.091 }, { lat: 51.050, lon: 7.097 }, { lat: 51.058, lon: 7.116 }, { lat: 51.075, lon: 7.060 }, { lat: 51.097, lon: 7.074 },
    { lat: 51.097, lon: 7.039 }, { lat: 51.081, lon: 7.010 }, { lat: 51.091, lon: 6.989 }, { lat: 51.067, lon: 6.974 }, { lat: 51.082, lon: 6.922 },
    ],
  },
  {
    name: "Märkischer Kreis",
    outline: [
    { lat: 51.198, lon: 7.417 }, { lat: 51.165, lon: 7.448 }, { lat: 51.158, lon: 7.439 }, { lat: 51.165, lon: 7.479 }, { lat: 51.146, lon: 7.469 },
    { lat: 51.125, lon: 7.493 }, { lat: 51.128, lon: 7.504 }, { lat: 51.103, lon: 7.503 }, { lat: 51.107, lon: 7.582 }, { lat: 51.098, lon: 7.606 },
    { lat: 51.081, lon: 7.601 }, { lat: 51.069, lon: 7.626 }, { lat: 51.086, lon: 7.689 }, { lat: 51.073, lon: 7.714 }, { lat: 51.075, lon: 7.821 },
    { lat: 51.109, lon: 7.819 }, { lat: 51.126, lon: 7.839 }, { lat: 51.147, lon: 7.796 }, { lat: 51.165, lon: 7.830 }, { lat: 51.166, lon: 7.900 },
    { lat: 51.183, lon: 7.909 }, { lat: 51.170, lon: 7.928 }, { lat: 51.178, lon: 7.950 }, { lat: 51.209, lon: 7.926 }, { lat: 51.229, lon: 7.951 },
    { lat: 51.244, lon: 7.919 }, { lat: 51.260, lon: 7.922 }, { lat: 51.277, lon: 7.903 }, { lat: 51.297, lon: 7.919 }, { lat: 51.306, lon: 7.901 },
    { lat: 51.320, lon: 7.934 }, { lat: 51.334, lon: 7.932 }, { lat: 51.348, lon: 7.906 }, { lat: 51.446, lon: 7.880 }, { lat: 51.478, lon: 7.842 },
    { lat: 51.468, lon: 7.796 }, { lat: 51.474, lon: 7.699 }, { lat: 51.447, lon: 7.613 }, { lat: 51.423, lon: 7.631 }, { lat: 51.419, lon: 7.616 },
    { lat: 51.407, lon: 7.632 }, { lat: 51.385, lon: 7.612 }, { lat: 51.396, lon: 7.597 }, { lat: 51.390, lon: 7.587 }, { lat: 51.347, lon: 7.599 },
    { lat: 51.330, lon: 7.577 }, { lat: 51.296, lon: 7.583 }, { lat: 51.269, lon: 7.549 }, { lat: 51.264, lon: 7.513 }, { lat: 51.238, lon: 7.491 },
    { lat: 51.225, lon: 7.441 },
    ],
  },
  {
    name: "Mönchengladbach",
    outline: [
    { lat: 51.176, lon: 6.291 }, { lat: 51.166, lon: 6.306 }, { lat: 51.152, lon: 6.302 }, { lat: 51.126, lon: 6.356 }, { lat: 51.101, lon: 6.352 },
    { lat: 51.099, lon: 6.392 }, { lat: 51.090, lon: 6.385 }, { lat: 51.086, lon: 6.406 }, { lat: 51.089, lon: 6.444 }, { lat: 51.110, lon: 6.443 },
    { lat: 51.118, lon: 6.465 }, { lat: 51.112, lon: 6.477 }, { lat: 51.130, lon: 6.467 }, { lat: 51.144, lon: 6.477 }, { lat: 51.149, lon: 6.503 },
    { lat: 51.140, lon: 6.515 }, { lat: 51.146, lon: 6.537 }, { lat: 51.184, lon: 6.516 }, { lat: 51.171, lon: 6.490 }, { lat: 51.176, lon: 6.480 },
    { lat: 51.228, lon: 6.491 }, { lat: 51.220, lon: 6.511 }, { lat: 51.230, lon: 6.520 }, { lat: 51.248, lon: 6.458 }, { lat: 51.219, lon: 6.412 },
    { lat: 51.218, lon: 6.372 }, { lat: 51.229, lon: 6.361 }, { lat: 51.225, lon: 6.330 }, { lat: 51.182, lon: 6.318 },
    ],
  },
  {
    name: "Mülheim an der Ruhr",
    outline: [
    { lat: 51.447, lon: 6.807 }, { lat: 51.438, lon: 6.818 }, { lat: 51.369, lon: 6.815 }, { lat: 51.351, lon: 6.831 }, { lat: 51.365, lon: 6.846 },
    { lat: 51.368, lon: 6.906 }, { lat: 51.379, lon: 6.911 }, { lat: 51.389, lon: 6.943 }, { lat: 51.439, lon: 6.960 }, { lat: 51.449, lon: 6.951 },
    { lat: 51.450, lon: 6.915 }, { lat: 51.469, lon: 6.909 }, { lat: 51.449, lon: 6.827 }, { lat: 51.457, lon: 6.814 },
    ],
  },
  {
    name: "Münster",
    outline: [
    { lat: 51.942, lon: 7.474 }, { lat: 51.936, lon: 7.512 }, { lat: 51.894, lon: 7.510 }, { lat: 51.901, lon: 7.535 }, { lat: 51.870, lon: 7.547 },
    { lat: 51.865, lon: 7.565 }, { lat: 51.856, lon: 7.558 }, { lat: 51.840, lon: 7.611 }, { lat: 51.857, lon: 7.616 }, { lat: 51.861, lon: 7.647 },
    { lat: 51.868, lon: 7.637 }, { lat: 51.879, lon: 7.651 }, { lat: 51.869, lon: 7.700 }, { lat: 51.875, lon: 7.710 }, { lat: 51.902, lon: 7.687 },
    { lat: 51.908, lon: 7.705 }, { lat: 51.898, lon: 7.758 }, { lat: 51.912, lon: 7.757 }, { lat: 51.922, lon: 7.774 }, { lat: 51.968, lon: 7.734 },
    { lat: 51.983, lon: 7.729 }, { lat: 51.998, lon: 7.747 }, { lat: 52.032, lon: 7.721 }, { lat: 52.033, lon: 7.686 }, { lat: 52.053, lon: 7.651 },
    { lat: 52.041, lon: 7.631 }, { lat: 52.060, lon: 7.599 }, { lat: 52.033, lon: 7.531 }, { lat: 52.020, lon: 7.534 }, { lat: 52.009, lon: 7.513 },
    { lat: 51.978, lon: 7.523 }, { lat: 51.957, lon: 7.481 },
    ],
  },
  {
    name: "Oberbergischer Kreis",
    outline: [
    { lat: 50.986, lon: 7.251 }, { lat: 50.971, lon: 7.284 }, { lat: 50.978, lon: 7.292 }, { lat: 50.977, lon: 7.331 }, { lat: 50.964, lon: 7.329 },
    { lat: 50.967, lon: 7.340 }, { lat: 50.950, lon: 7.356 }, { lat: 50.959, lon: 7.387 }, { lat: 50.949, lon: 7.400 }, { lat: 50.947, lon: 7.444 },
    { lat: 50.911, lon: 7.479 }, { lat: 50.881, lon: 7.460 }, { lat: 50.874, lon: 7.491 }, { lat: 50.831, lon: 7.529 }, { lat: 50.843, lon: 7.573 },
    { lat: 50.827, lon: 7.596 }, { lat: 50.829, lon: 7.619 }, { lat: 50.820, lon: 7.620 }, { lat: 50.835, lon: 7.647 }, { lat: 50.819, lon: 7.670 },
    { lat: 50.826, lon: 7.700 }, { lat: 50.851, lon: 7.730 }, { lat: 50.845, lon: 7.763 }, { lat: 50.850, lon: 7.752 }, { lat: 50.857, lon: 7.766 },
    { lat: 50.867, lon: 7.748 }, { lat: 50.900, lon: 7.760 }, { lat: 50.918, lon: 7.735 }, { lat: 50.930, lon: 7.776 }, { lat: 50.953, lon: 7.792 },
    { lat: 50.980, lon: 7.781 }, { lat: 50.978, lon: 7.749 }, { lat: 50.998, lon: 7.726 }, { lat: 51.024, lon: 7.736 }, { lat: 51.062, lon: 7.702 },
    { lat: 51.073, lon: 7.714 }, { lat: 51.086, lon: 7.689 }, { lat: 51.069, lon: 7.626 }, { lat: 51.081, lon: 7.601 }, { lat: 51.098, lon: 7.606 },
    { lat: 51.105, lon: 7.587 }, { lat: 51.106, lon: 7.496 }, { lat: 51.128, lon: 7.504 }, { lat: 51.125, lon: 7.493 }, { lat: 51.146, lon: 7.469 },
    { lat: 51.165, lon: 7.479 }, { lat: 51.158, lon: 7.439 }, { lat: 51.165, lon: 7.448 }, { lat: 51.198, lon: 7.417 }, { lat: 51.224, lon: 7.430 },
    { lat: 51.221, lon: 7.404 }, { lat: 51.247, lon: 7.390 }, { lat: 51.239, lon: 7.341 }, { lat: 51.250, lon: 7.329 }, { lat: 51.224, lon: 7.297 },
    { lat: 51.182, lon: 7.309 }, { lat: 51.148, lon: 7.295 }, { lat: 51.147, lon: 7.270 }, { lat: 51.115, lon: 7.274 }, { lat: 51.105, lon: 7.299 },
    { lat: 51.083, lon: 7.274 }, { lat: 51.069, lon: 7.300 }, { lat: 51.080, lon: 7.317 }, { lat: 51.070, lon: 7.324 }, { lat: 51.071, lon: 7.339 },
    { lat: 51.028, lon: 7.313 }, { lat: 51.027, lon: 7.280 }, { lat: 51.005, lon: 7.282 },
    ],
  },
  {
    name: "Oberhausen",
    outline: [
    { lat: 51.523, lon: 6.777 }, { lat: 51.507, lon: 6.820 }, { lat: 51.488, lon: 6.823 }, { lat: 51.475, lon: 6.809 }, { lat: 51.469, lon: 6.822 },
    { lat: 51.456, lon: 6.809 }, { lat: 51.449, lon: 6.827 }, { lat: 51.470, lon: 6.897 }, { lat: 51.488, lon: 6.902 }, { lat: 51.499, lon: 6.930 },
    { lat: 51.516, lon: 6.894 }, { lat: 51.557, lon: 6.860 }, { lat: 51.567, lon: 6.868 }, { lat: 51.580, lon: 6.833 }, { lat: 51.547, lon: 6.783 },
    ],
  },
  {
    name: "Remscheid",
    outline: [
    { lat: 51.158, lon: 7.131 }, { lat: 51.142, lon: 7.146 }, { lat: 51.156, lon: 7.160 }, { lat: 51.151, lon: 7.198 }, { lat: 51.161, lon: 7.220 },
    { lat: 51.144, lon: 7.287 }, { lat: 51.189, lon: 7.309 }, { lat: 51.186, lon: 7.299 }, { lat: 51.195, lon: 7.306 }, { lat: 51.210, lon: 7.290 },
    { lat: 51.209, lon: 7.266 }, { lat: 51.227, lon: 7.235 }, { lat: 51.211, lon: 7.203 }, { lat: 51.211, lon: 7.166 }, { lat: 51.190, lon: 7.141 },
    { lat: 51.175, lon: 7.152 },
    ],
  },
  {
    name: "Rhein-Erft-Kreis",
    outline: [
    { lat: 51.025, lon: 6.453 }, { lat: 50.984, lon: 6.474 }, { lat: 50.977, lon: 6.499 }, { lat: 50.963, lon: 6.479 }, { lat: 50.952, lon: 6.485 },
    { lat: 50.931, lon: 6.503 }, { lat: 50.932, lon: 6.525 }, { lat: 50.896, lon: 6.519 }, { lat: 50.893, lon: 6.553 }, { lat: 50.878, lon: 6.562 },
    { lat: 50.850, lon: 6.551 }, { lat: 50.848, lon: 6.598 }, { lat: 50.822, lon: 6.624 }, { lat: 50.835, lon: 6.653 }, { lat: 50.831, lon: 6.677 },
    { lat: 50.838, lon: 6.677 }, { lat: 50.835, lon: 6.706 }, { lat: 50.824, lon: 6.718 }, { lat: 50.804, lon: 6.718 }, { lat: 50.801, lon: 6.704 },
    { lat: 50.788, lon: 6.713 }, { lat: 50.774, lon: 6.679 }, { lat: 50.754, lon: 6.694 }, { lat: 50.746, lon: 6.724 }, { lat: 50.732, lon: 6.713 },
    { lat: 50.717, lon: 6.778 }, { lat: 50.764, lon: 6.813 }, { lat: 50.769, lon: 6.844 }, { lat: 50.782, lon: 6.838 }, { lat: 50.789, lon: 6.854 },
    { lat: 50.785, lon: 6.864 }, { lat: 50.805, lon: 6.934 }, { lat: 50.793, lon: 6.992 }, { lat: 50.801, lon: 7.030 }, { lat: 50.819, lon: 7.024 },
    { lat: 50.828, lon: 6.986 }, { lat: 50.844, lon: 6.974 }, { lat: 50.835, lon: 6.955 }, { lat: 50.845, lon: 6.945 }, { lat: 50.837, lon: 6.930 },
    { lat: 50.859, lon: 6.916 }, { lat: 50.893, lon: 6.920 }, { lat: 50.912, lon: 6.880 }, { lat: 50.904, lon: 6.860 }, { lat: 50.926, lon: 6.842 },
    { lat: 50.939, lon: 6.805 }, { lat: 50.989, lon: 6.845 }, { lat: 51.025, lon: 6.842 }, { lat: 51.039, lon: 6.821 }, { lat: 51.037, lon: 6.798 },
    { lat: 51.065, lon: 6.773 }, { lat: 51.066, lon: 6.753 }, { lat: 51.043, lon: 6.762 }, { lat: 51.046, lon: 6.744 }, { lat: 51.015, lon: 6.716 },
    { lat: 51.027, lon: 6.637 }, { lat: 51.022, lon: 6.566 }, { lat: 51.026, lon: 6.548 }, { lat: 51.035, lon: 6.561 }, { lat: 51.056, lon: 6.554 },
    { lat: 51.052, lon: 6.538 }, { lat: 51.059, lon: 6.535 },
    ],
  },
  {
    name: "Rhein-Kreis Neuss",
    outline: [
    { lat: 51.100, lon: 6.436 }, { lat: 51.082, lon: 6.455 }, { lat: 51.062, lon: 6.447 }, { lat: 51.056, lon: 6.477 }, { lat: 51.043, lon: 6.459 },
    { lat: 51.034, lon: 6.480 }, { lat: 51.058, lon: 6.519 }, { lat: 51.056, lon: 6.554 }, { lat: 51.035, lon: 6.561 }, { lat: 51.026, lon: 6.548 },
    { lat: 51.018, lon: 6.582 }, { lat: 51.027, lon: 6.637 }, { lat: 51.015, lon: 6.716 }, { lat: 51.046, lon: 6.744 }, { lat: 51.043, lon: 6.762 },
    { lat: 51.066, lon: 6.753 }, { lat: 51.068, lon: 6.790 }, { lat: 51.046, lon: 6.813 }, { lat: 51.060, lon: 6.834 }, { lat: 51.074, lon: 6.825 },
    { lat: 51.104, lon: 6.883 }, { lat: 51.133, lon: 6.850 }, { lat: 51.158, lon: 6.857 }, { lat: 51.162, lon: 6.839 }, { lat: 51.144, lon: 6.814 },
    { lat: 51.144, lon: 6.799 }, { lat: 51.181, lon: 6.793 }, { lat: 51.183, lon: 6.737 }, { lat: 51.226, lon: 6.724 }, { lat: 51.229, lon: 6.689 },
    { lat: 51.257, lon: 6.727 }, { lat: 51.271, lon: 6.703 }, { lat: 51.313, lon: 6.735 }, { lat: 51.333, lon: 6.714 }, { lat: 51.309, lon: 6.652 },
    { lat: 51.309, lon: 6.621 }, { lat: 51.289, lon: 6.620 }, { lat: 51.285, lon: 6.585 }, { lat: 51.262, lon: 6.596 }, { lat: 51.263, lon: 6.611 },
    { lat: 51.250, lon: 6.626 }, { lat: 51.241, lon: 6.568 }, { lat: 51.229, lon: 6.562 }, { lat: 51.231, lon: 6.536 }, { lat: 51.223, lon: 6.530 },
    { lat: 51.228, lon: 6.491 }, { lat: 51.176, lon: 6.480 }, { lat: 51.171, lon: 6.490 }, { lat: 51.184, lon: 6.516 }, { lat: 51.146, lon: 6.537 },
    { lat: 51.140, lon: 6.515 }, { lat: 51.149, lon: 6.503 }, { lat: 51.144, lon: 6.477 }, { lat: 51.130, lon: 6.467 }, { lat: 51.112, lon: 6.477 },
    { lat: 51.118, lon: 6.465 },
    ],
  },
  {
    name: "Rhein-Sieg-Kreis",
    outline: [
    { lat: 50.697, lon: 6.854 }, { lat: 50.690, lon: 6.876 }, { lat: 50.651, lon: 6.860 }, { lat: 50.629, lon: 6.916 }, { lat: 50.609, lon: 6.904 },
    { lat: 50.606, lon: 6.914 }, { lat: 50.600, lon: 6.884 }, { lat: 50.574, lon: 6.891 }, { lat: 50.570, lon: 6.901 }, { lat: 50.579, lon: 6.912 },
    { lat: 50.571, lon: 6.918 }, { lat: 50.579, lon: 6.927 }, { lat: 50.559, lon: 6.928 }, { lat: 50.564, lon: 6.947 }, { lat: 50.556, lon: 6.972 },
    { lat: 50.604, lon: 7.049 }, { lat: 50.586, lon: 7.094 }, { lat: 50.612, lon: 7.115 }, { lat: 50.600, lon: 7.148 }, { lat: 50.615, lon: 7.155 },
    { lat: 50.612, lon: 7.173 }, { lat: 50.627, lon: 7.191 }, { lat: 50.643, lon: 7.195 }, { lat: 50.652, lon: 7.181 }, { lat: 50.647, lon: 7.128 },
    { lat: 50.660, lon: 7.105 }, { lat: 50.633, lon: 7.060 }, { lat: 50.654, lon: 7.026 }, { lat: 50.665, lon: 7.025 }, { lat: 50.662, lon: 7.037 },
    { lat: 50.674, lon: 7.044 }, { lat: 50.706, lon: 7.023 }, { lat: 50.719, lon: 7.040 }, { lat: 50.726, lon: 7.030 }, { lat: 50.758, lon: 7.037 },
    { lat: 50.771, lon: 7.067 }, { lat: 50.762, lon: 7.101 }, { lat: 50.774, lon: 7.125 }, { lat: 50.753, lon: 7.158 }, { lat: 50.748, lon: 7.200 },
    { lat: 50.737, lon: 7.209 }, { lat: 50.727, lon: 7.191 }, { lat: 50.712, lon: 7.195 }, { lat: 50.703, lon: 7.168 }, { lat: 50.692, lon: 7.173 },
    { lat: 50.651, lon: 7.210 }, { lat: 50.623, lon: 7.213 }, { lat: 50.624, lon: 7.257 }, { lat: 50.649, lon: 7.358 }, { lat: 50.682, lon: 7.372 },
    { lat: 50.698, lon: 7.357 }, { lat: 50.718, lon: 7.374 }, { lat: 50.710, lon: 7.437 }, { lat: 50.729, lon: 7.520 }, { lat: 50.737, lon: 7.519 },
    { lat: 50.747, lon: 7.551 }, { lat: 50.739, lon: 7.584 }, { lat: 50.767, lon: 7.599 }, { lat: 50.768, lon: 7.655 }, { lat: 50.785, lon: 7.659 },
    { lat: 50.781, lon: 7.678 }, { lat: 50.810, lon: 7.679 }, { lat: 50.835, lon: 7.647 }, { lat: 50.820, lon: 7.620 }, { lat: 50.829, lon: 7.619 },
    { lat: 50.827, lon: 7.596 }, { lat: 50.843, lon: 7.573 }, { lat: 50.831, lon: 7.529 }, { lat: 50.874, lon: 7.491 }, { lat: 50.881, lon: 7.460 },
    { lat: 50.910, lon: 7.479 }, { lat: 50.936, lon: 7.462 }, { lat: 50.947, lon: 7.444 }, { lat: 50.950, lon: 7.397 }, { lat: 50.911, lon: 7.337 },
    { lat: 50.917, lon: 7.325 }, { lat: 50.907, lon: 7.302 }, { lat: 50.911, lon: 7.275 }, { lat: 50.929, lon: 7.247 }, { lat: 50.875, lon: 7.197 },
    { lat: 50.832, lon: 7.086 }, { lat: 50.830, lon: 7.063 }, { lat: 50.850, lon: 7.051 }, { lat: 50.838, lon: 7.016 }, { lat: 50.844, lon: 6.984 },
    { lat: 50.830, lon: 6.982 }, { lat: 50.820, lon: 7.023 }, { lat: 50.801, lon: 7.030 }, { lat: 50.793, lon: 6.992 }, { lat: 50.805, lon: 6.934 },
    { lat: 50.791, lon: 6.870 }, { lat: 50.763, lon: 6.860 }, { lat: 50.746, lon: 6.881 }, { lat: 50.750, lon: 6.902 }, { lat: 50.734, lon: 6.916 },
    { lat: 50.721, lon: 6.893 }, { lat: 50.714, lon: 6.899 }, { lat: 50.709, lon: 6.859 },
    ],
  },
  {
    name: "Rheinisch-Bergischer Kreis",
    outline: [
    { lat: 51.106, lon: 6.988 }, { lat: 51.091, lon: 6.989 }, { lat: 51.081, lon: 7.010 }, { lat: 51.097, lon: 7.039 }, { lat: 51.097, lon: 7.074 },
    { lat: 51.075, lon: 7.060 }, { lat: 51.064, lon: 7.114 }, { lat: 51.050, lon: 7.097 }, { lat: 51.031, lon: 7.098 }, { lat: 51.013, lon: 7.062 },
    { lat: 51.002, lon: 7.076 }, { lat: 50.989, lon: 7.069 }, { lat: 50.981, lon: 7.100 }, { lat: 50.957, lon: 7.087 }, { lat: 50.941, lon: 7.115 },
    { lat: 50.946, lon: 7.145 }, { lat: 50.881, lon: 7.138 }, { lat: 50.867, lon: 7.160 }, { lat: 50.875, lon: 7.197 }, { lat: 50.929, lon: 7.247 },
    { lat: 50.907, lon: 7.302 }, { lat: 50.917, lon: 7.325 }, { lat: 50.913, lon: 7.347 }, { lat: 50.935, lon: 7.362 }, { lat: 50.935, lon: 7.387 },
    { lat: 50.950, lon: 7.399 }, { lat: 50.959, lon: 7.387 }, { lat: 50.950, lon: 7.356 }, { lat: 50.967, lon: 7.340 }, { lat: 50.964, lon: 7.329 },
    { lat: 50.977, lon: 7.331 }, { lat: 50.978, lon: 7.292 }, { lat: 50.971, lon: 7.284 }, { lat: 50.986, lon: 7.251 }, { lat: 51.005, lon: 7.282 },
    { lat: 51.027, lon: 7.280 }, { lat: 51.028, lon: 7.313 }, { lat: 51.071, lon: 7.339 }, { lat: 51.070, lon: 7.324 }, { lat: 51.080, lon: 7.317 },
    { lat: 51.069, lon: 7.300 }, { lat: 51.083, lon: 7.274 }, { lat: 51.105, lon: 7.299 }, { lat: 51.114, lon: 7.274 }, { lat: 51.144, lon: 7.272 },
    { lat: 51.157, lon: 7.255 }, { lat: 51.154, lon: 7.166 }, { lat: 51.133, lon: 7.160 }, { lat: 51.124, lon: 7.173 }, { lat: 51.114, lon: 7.148 },
    { lat: 51.123, lon: 7.119 }, { lat: 51.138, lon: 7.110 }, { lat: 51.138, lon: 7.083 }, { lat: 51.126, lon: 7.075 }, { lat: 51.132, lon: 7.043 },
    { lat: 51.123, lon: 7.003 },
    ],
  },
  {
    name: "Solingen",
    outline: [
    { lat: 51.147, lon: 6.951 }, { lat: 51.145, lon: 6.994 }, { lat: 51.120, lon: 6.998 }, { lat: 51.132, lon: 7.035 }, { lat: 51.126, lon: 7.075 },
    { lat: 51.138, lon: 7.083 }, { lat: 51.138, lon: 7.110 }, { lat: 51.123, lon: 7.119 }, { lat: 51.114, lon: 7.147 }, { lat: 51.124, lon: 7.173 },
    { lat: 51.133, lon: 7.160 }, { lat: 51.155, lon: 7.164 }, { lat: 51.142, lon: 7.148 }, { lat: 51.149, lon: 7.134 }, { lat: 51.164, lon: 7.139 },
    { lat: 51.220, lon: 7.092 }, { lat: 51.217, lon: 7.066 }, { lat: 51.189, lon: 7.030 }, { lat: 51.164, lon: 6.959 },
    ],
  },
  {
    name: "Städteregion Aachen",
    outline: [
    { lat: 50.798, lon: 5.975 }, { lat: 50.774, lon: 6.028 }, { lat: 50.763, lon: 6.018 }, { lat: 50.746, lon: 6.040 }, { lat: 50.718, lon: 6.039 },
    { lat: 50.728, lon: 6.044 }, { lat: 50.722, lon: 6.115 }, { lat: 50.662, lon: 6.166 }, { lat: 50.663, lon: 6.195 }, { lat: 50.641, lon: 6.187 },
    { lat: 50.641, lon: 6.222 }, { lat: 50.649, lon: 6.231 }, { lat: 50.642, lon: 6.267 }, { lat: 50.629, lon: 6.274 }, { lat: 50.604, lon: 6.248 },
    { lat: 50.566, lon: 6.236 }, { lat: 50.539, lon: 6.198 }, { lat: 50.495, lon: 6.224 }, { lat: 50.505, lon: 6.270 }, { lat: 50.496, lon: 6.317 },
    { lat: 50.510, lon: 6.355 }, { lat: 50.532, lon: 6.380 }, { lat: 50.530, lon: 6.358 }, { lat: 50.561, lon: 6.365 }, { lat: 50.583, lon: 6.394 },
    { lat: 50.597, lon: 6.391 }, { lat: 50.609, lon: 6.420 }, { lat: 50.601, lon: 6.413 }, { lat: 50.608, lon: 6.387 }, { lat: 50.618, lon: 6.395 },
    { lat: 50.623, lon: 6.381 }, { lat: 50.625, lon: 6.397 }, { lat: 50.634, lon: 6.394 }, { lat: 50.629, lon: 6.408 }, { lat: 50.642, lon: 6.411 },
    { lat: 50.650, lon: 6.391 }, { lat: 50.644, lon: 6.383 }, { lat: 50.669, lon: 6.376 }, { lat: 50.651, lon: 6.334 }, { lat: 50.665, lon: 6.323 },
    { lat: 50.666, lon: 6.300 }, { lat: 50.678, lon: 6.285 }, { lat: 50.687, lon: 6.286 }, { lat: 50.691, lon: 6.313 }, { lat: 50.716, lon: 6.313 },
    { lat: 50.755, lon: 6.342 }, { lat: 50.759, lon: 6.366 }, { lat: 50.789, lon: 6.353 }, { lat: 50.771, lon: 6.318 }, { lat: 50.792, lon: 6.299 },
    { lat: 50.817, lon: 6.340 }, { lat: 50.883, lon: 6.308 }, { lat: 50.863, lon: 6.268 }, { lat: 50.873, lon: 6.242 }, { lat: 50.867, lon: 6.223 },
    { lat: 50.874, lon: 6.230 }, { lat: 50.902, lon: 6.200 }, { lat: 50.921, lon: 6.229 }, { lat: 50.935, lon: 6.230 }, { lat: 50.947, lon: 6.183 },
    { lat: 50.934, lon: 6.159 }, { lat: 50.899, lon: 6.140 }, { lat: 50.913, lon: 6.087 }, { lat: 50.847, lon: 6.074 }, { lat: 50.857, lon: 6.055 },
    { lat: 50.846, lon: 6.019 }, { lat: 50.814, lon: 6.025 }, { lat: 50.801, lon: 6.004 }, { lat: 50.810, lon: 5.985 },
    ],
  },
  {
    name: "Wuppertal",
    outline: [
    { lat: 51.245, lon: 7.014 }, { lat: 51.228, lon: 7.041 }, { lat: 51.232, lon: 7.052 }, { lat: 51.217, lon: 7.035 }, { lat: 51.209, lon: 7.047 },
    { lat: 51.220, lon: 7.082 }, { lat: 51.215, lon: 7.105 }, { lat: 51.184, lon: 7.114 }, { lat: 51.166, lon: 7.136 }, { lat: 51.175, lon: 7.152 },
    { lat: 51.190, lon: 7.141 }, { lat: 51.211, lon: 7.166 }, { lat: 51.211, lon: 7.203 }, { lat: 51.227, lon: 7.235 }, { lat: 51.209, lon: 7.266 },
    { lat: 51.205, lon: 7.296 }, { lat: 51.224, lon: 7.297 }, { lat: 51.234, lon: 7.313 }, { lat: 51.247, lon: 7.297 }, { lat: 51.253, lon: 7.305 },
    { lat: 51.256, lon: 7.268 }, { lat: 51.272, lon: 7.278 }, { lat: 51.284, lon: 7.256 }, { lat: 51.318, lon: 7.264 }, { lat: 51.295, lon: 7.198 },
    { lat: 51.298, lon: 7.169 }, { lat: 51.305, lon: 7.181 }, { lat: 51.313, lon: 7.170 }, { lat: 51.306, lon: 7.117 }, { lat: 51.258, lon: 7.062 },
    ],
  },
];

/**
 * Lauf des Rheins durch das Land, von Sued nach Nord.
 *
 * Nur als Orientierungslinie auf der Buehnenkarte: Die Silhouette allein wird
 * oft nicht erkannt, mit dem Rhein und den groessten Staedten schon.
 */
export const rhineCourse: LatLon[] = [
  { lat: 50.64, lon: 7.21 },
  { lat: 50.73, lon: 7.1 },
  { lat: 50.86, lon: 7.0 },
  { lat: 50.94, lon: 6.96 },
  { lat: 51.03, lon: 6.98 },
  { lat: 51.14, lon: 6.86 },
  { lat: 51.22, lon: 6.77 },
  { lat: 51.31, lon: 6.72 },
  { lat: 51.38, lon: 6.66 },
  { lat: 51.45, lon: 6.73 },
  { lat: 51.55, lon: 6.72 },
  { lat: 51.65, lon: 6.61 },
  { lat: 51.72, lon: 6.5 },
  { lat: 51.76, lon: 6.4 },
  { lat: 51.83, lon: 6.24 },
  { lat: 51.84, lon: 6.16 },
];

/**
 * Ballungsraeume mit relativem Gewicht. Das Gewicht steuert nur, wie dicht die
 * symbolische Punktwolke dort erscheint, und bildet ungefaehr die
 * Bevoelkerungsverteilung ab.
 */
export const nrwHubs: { name: string; lat: number; lon: number; weight: number; radius: number }[] = [
  { name: "Köln", lat: 50.94, lon: 6.96, weight: 11, radius: 0.22 },
  { name: "Düsseldorf", lat: 51.23, lon: 6.78, weight: 8, radius: 0.18 },
  { name: "Dortmund", lat: 51.51, lon: 7.47, weight: 8, radius: 0.18 },
  { name: "Essen", lat: 51.46, lon: 7.01, weight: 7, radius: 0.16 },
  { name: "Duisburg", lat: 51.43, lon: 6.76, weight: 6, radius: 0.14 },
  { name: "Wuppertal", lat: 51.26, lon: 7.15, weight: 9, radius: 0.2 },
  { name: "Bochum", lat: 51.48, lon: 7.22, weight: 5, radius: 0.13 },
  { name: "Bielefeld", lat: 52.02, lon: 8.53, weight: 5, radius: 0.22 },
  { name: "Bonn", lat: 50.74, lon: 7.1, weight: 5, radius: 0.16 },
  { name: "Münster", lat: 51.96, lon: 7.63, weight: 5, radius: 0.24 },
  { name: "Aachen", lat: 50.78, lon: 6.08, weight: 4, radius: 0.18 },
  { name: "Mönchengladbach", lat: 51.19, lon: 6.44, weight: 4, radius: 0.16 },
  { name: "Gelsenkirchen", lat: 51.52, lon: 7.09, weight: 3, radius: 0.11 },
  { name: "Krefeld", lat: 51.33, lon: 6.56, weight: 3, radius: 0.13 },
  { name: "Hagen", lat: 51.36, lon: 7.47, weight: 3, radius: 0.14 },
  { name: "Hamm", lat: 51.68, lon: 7.82, weight: 3, radius: 0.16 },
  { name: "Siegen", lat: 50.88, lon: 8.02, weight: 3, radius: 0.2 },
  { name: "Paderborn", lat: 51.72, lon: 8.75, weight: 3, radius: 0.22 },
  { name: "Recklinghausen", lat: 51.61, lon: 7.2, weight: 3, radius: 0.14 },
  { name: "Solingen", lat: 51.17, lon: 7.08, weight: 3, radius: 0.1 },
  { name: "Remscheid", lat: 51.18, lon: 7.19, weight: 3, radius: 0.1 },
  { name: "Leverkusen", lat: 51.03, lon: 6.99, weight: 2, radius: 0.11 },
  { name: "Minden", lat: 52.29, lon: 8.92, weight: 2, radius: 0.16 },
  { name: "Detmold", lat: 51.94, lon: 8.88, weight: 2, radius: 0.18 },
  { name: "Arnsberg", lat: 51.4, lon: 8.06, weight: 2, radius: 0.24 },
  { name: "Kleve", lat: 51.79, lon: 6.14, weight: 2, radius: 0.2 },
  { name: "Euskirchen", lat: 50.66, lon: 6.79, weight: 2, radius: 0.2 },
  { name: "Höxter", lat: 51.78, lon: 9.38, weight: 1, radius: 0.14 },
  // Mittelstaedte. Sie tragen wenig zur Punktdichte bei, sorgen auf der Karte
  // aber fuer ein dichtes Ortsnetz statt einzelner Inseln im Ruhrgebiet.
  { name: "Oberhausen", lat: 51.47, lon: 6.85, weight: 3, radius: 0.09 },
  { name: "Mülheim an der Ruhr", lat: 51.43, lon: 6.88, weight: 2, radius: 0.09 },
  { name: "Herne", lat: 51.54, lon: 7.22, weight: 2, radius: 0.08 },
  { name: "Bottrop", lat: 51.52, lon: 6.93, weight: 2, radius: 0.09 },
  { name: "Neuss", lat: 51.2, lon: 6.69, weight: 2, radius: 0.1 },
  { name: "Bergisch Gladbach", lat: 50.99, lon: 7.13, weight: 2, radius: 0.09 },
  { name: "Witten", lat: 51.44, lon: 7.34, weight: 2, radius: 0.08 },
  { name: "Iserlohn", lat: 51.37, lon: 7.7, weight: 2, radius: 0.1 },
  { name: "Gütersloh", lat: 51.9, lon: 8.38, weight: 2, radius: 0.12 },
  { name: "Düren", lat: 50.8, lon: 6.48, weight: 2, radius: 0.12 },
  { name: "Moers", lat: 51.45, lon: 6.63, weight: 2, radius: 0.09 },
  { name: "Lüdenscheid", lat: 51.22, lon: 7.63, weight: 1, radius: 0.1 },
  { name: "Marl", lat: 51.66, lon: 7.09, weight: 1, radius: 0.09 },
  { name: "Velbert", lat: 51.34, lon: 7.04, weight: 1, radius: 0.08 },
  { name: "Dinslaken", lat: 51.56, lon: 6.74, weight: 1, radius: 0.09 },
  { name: "Viersen", lat: 51.26, lon: 6.39, weight: 1, radius: 0.1 },
  { name: "Rheine", lat: 52.28, lon: 7.44, weight: 1, radius: 0.12 },
  { name: "Troisdorf", lat: 50.81, lon: 7.15, weight: 1, radius: 0.08 },
  { name: "Gummersbach", lat: 51.03, lon: 7.56, weight: 1, radius: 0.12 },
  { name: "Unna", lat: 51.54, lon: 7.69, weight: 1, radius: 0.1 },
  { name: "Soest", lat: 51.57, lon: 8.11, weight: 1, radius: 0.12 },
  { name: "Bocholt", lat: 51.84, lon: 6.61, weight: 1, radius: 0.12 },
  { name: "Coesfeld", lat: 51.94, lon: 7.17, weight: 1, radius: 0.12 },
  { name: "Lünen", lat: 51.61, lon: 7.53, weight: 1, radius: 0.09 },
  { name: "Herford", lat: 52.11, lon: 8.67, weight: 1, radius: 0.1 },
  { name: "Lippstadt", lat: 51.67, lon: 8.35, weight: 1, radius: 0.12 },
  { name: "Wesel", lat: 51.66, lon: 6.62, weight: 1, radius: 0.1 },
  { name: "Meschede", lat: 51.35, lon: 8.28, weight: 1, radius: 0.14 },
  { name: "Olpe", lat: 51.03, lon: 7.85, weight: 1, radius: 0.12 },
  { name: "Brilon", lat: 51.4, lon: 8.57, weight: 1, radius: 0.14 },
  { name: "Warendorf", lat: 51.95, lon: 7.99, weight: 1, radius: 0.12 },
  { name: "Steinfurt", lat: 52.15, lon: 7.34, weight: 1, radius: 0.12 },
  { name: "Grevenbroich", lat: 51.09, lon: 6.58, weight: 1, radius: 0.1 },
  { name: "Jülich", lat: 50.92, lon: 6.36, weight: 1, radius: 0.1 },
  { name: "Eschweiler", lat: 50.82, lon: 6.27, weight: 1, radius: 0.08 },
  { name: "Heinsberg", lat: 51.06, lon: 6.1, weight: 1, radius: 0.1 },
  { name: "Bad Oeynhausen", lat: 52.2, lon: 8.8, weight: 1, radius: 0.09 },
  { name: "Lemgo", lat: 52.03, lon: 8.9, weight: 1, radius: 0.1 },
];

const totalHubWeight = nrwHubs.reduce((sum, hub) => sum + hub.weight, 0);

export const nrwBounds = nrwOutline.reduce(
  (bounds, point) => ({
    latMin: Math.min(bounds.latMin, point.lat),
    latMax: Math.max(bounds.latMax, point.lat),
    lonMin: Math.min(bounds.lonMin, point.lon),
    lonMax: Math.max(bounds.lonMax, point.lon),
  }),
  { latMin: 90, latMax: -90, lonMin: 180, lonMax: -180 },
);

/** Mittlere Breite fuer die Laengengrad-Stauchung der Plattkarte. */
const latitudeScale = Math.cos(((nrwBounds.latMin + nrwBounds.latMax) / 2) * (Math.PI / 180));

/** Strahlverfahren (even-odd) gegen einen geschlossenen Ring. */
function pointInRing(point: LatLon, ring: LatLon[]): boolean {
  let inside = false;

  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const a = ring[index];
    const b = ring[previous];
    const straddles = a.lat > point.lat !== b.lat > point.lat;
    if (!straddles) continue;

    const crossing = a.lon + ((point.lat - a.lat) / (b.lat - a.lat)) * (b.lon - a.lon);
    if (point.lon < crossing) inside = !inside;
  }

  return inside;
}

/**
 * Liegt der Punkt innerhalb der Landesgrenze?
 *
 * Gebraucht wird das fuer die symbolische Punktwolke: Ein Streuradius von bis zu
 * 25 km um einen Ballungsraum wirft sonst sichtbar Punkte ueber die Grenze, und
 * die Karte verliert genau die Silhouette, die sie erkennbar macht.
 */
export function isInsideNrw(point: LatLon): boolean {
  return pointInRing(point, nrwOutline);
}

/** Kreis oder kreisfreie Stadt am Punkt, oder `null` ausserhalb des Landes. */
export function kreisForPoint(point: LatLon): string | null {
  for (const kreis of nrwKreise) {
    if (pointInRing(point, kreis.outline)) return kreis.name;
  }
  return null;
}

/**
 * Verteilt die anonymisierten Herkunftszellen auf die Kreise.
 *
 * Die Zellen sind das Einzige mit Ortsbezug, das das Dashboard ueberhaupt
 * bekommt - und auch das nur oberhalb der k-Anonymitaetsschwelle von fuenf
 * Reparaturen je Zelle. Die Summe je Kreis ist damit eine *Untergrenze*, nie
 * geschaetzt und nie hochgerechnet. Ohne Zellen bleibt die Karte gleichmaessig.
 */
export function kreisTotals(cells: OriginCell[]): Record<string, number> {
  const totals: Record<string, number> = {};

  for (const cell of cells) {
    const kreis = kreisForPoint(cell);
    if (kreis) totals[kreis] = (totals[kreis] ?? 0) + cell.count;
  }

  return totals;
}

/**
 * Projiziert Lat/Lon in normalisierte Koordinaten (0..1), y zeigt nach unten.
 * Das Seitenverhaeltnis bleibt erhalten; die kuerzere Achse wird zentriert.
 */
export function projectToUnitSquare(point: LatLon): { x: number; y: number } {
  const width = (nrwBounds.lonMax - nrwBounds.lonMin) * latitudeScale;
  const height = nrwBounds.latMax - nrwBounds.latMin;
  const size = Math.max(width, height);

  const x = ((point.lon - nrwBounds.lonMin) * latitudeScale + (size - width) / 2) / size;
  const y = (nrwBounds.latMax - point.lat + (size - height) / 2) / size;
  return { x, y };
}

/**
 * Umkehrung von `projectToUnitSquare`.
 *
 * Gebraucht fuer das Zeigen auf die Karte: Aus der Mausposition wird wieder eine
 * Koordinate, zu der sich der Kreis bestimmen laesst.
 */
export function unprojectFromUnitSquare(point: { x: number; y: number }): LatLon {
  const width = (nrwBounds.lonMax - nrwBounds.lonMin) * latitudeScale;
  const height = nrwBounds.latMax - nrwBounds.latMin;
  const size = Math.max(width, height);

  return {
    lon: (point.x * size - (size - width) / 2) / latitudeScale + nrwBounds.lonMin,
    lat: nrwBounds.latMax - (point.y * size - (size - height) / 2),
  };
}

export { hashString, seededRandom } from "./hash";

/**
 * Symbolische Position einer Einreichung auf der Karte, abgeleitet aus der ID.
 * Es handelt sich ausdruecklich nicht um den echten Reparaturort.
 */
export function symbolicPosition(id: string): { x: number; y: number; hub: string } {
  const random = seededRandom(hashString(id));
  let pick = random() * totalHubWeight;
  let hub = nrwHubs[nrwHubs.length - 1];

  for (const candidate of nrwHubs) {
    pick -= candidate.weight;
    if (pick <= 0) {
      hub = candidate;
      break;
    }
  }

  // Streuen und dabei die Landesgrenze respektieren. Nach einigen Fehlversuchen
  // bleibt der Punkt im Zentrum des Ballungsraums - das ist unauffaelliger als
  // ein Punkt jenseits der Grenze und passiert nur in Randlagen wie Aachen.
  let candidate = { lat: hub.lat, lon: hub.lon };
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random()) * hub.radius;
    const point = {
      lat: hub.lat + Math.sin(angle) * distance,
      lon: hub.lon + (Math.cos(angle) * distance) / latitudeScale,
    };
    if (isInsideNrw(point)) {
      candidate = point;
      break;
    }
  }

  return { ...projectToUnitSquare(candidate), hub: hub.name };
}

/** Anonymisierte Herkunftszelle, wie sie das Dashboard-Aggregat liefert. */
export type OriginCell = { lat: number; lon: number; count: number };

/**
 * Position eines Punktes auf der Karte.
 *
 * Liegen Herkunftszellen vor, wird der Punkt einer davon zugelost - gewichtet
 * nach der Zahl der Reparaturen darin. Innerhalb der Zelle wird er zusaetzlich
 * gestreut, damit nicht alle Punkte einer Zelle exakt uebereinander liegen.
 * Das ist rein optisch; die Zuordnung Punkt-zu-Zelle ist ohnehin willkuerlich,
 * weil das Aggregat nur Summen und keine Einzelbeitraege enthaelt.
 *
 * Ohne Zellen - etwa vor der ersten anonymisierten Einreichung - bleibt es bei
 * der symbolischen Verteilung ueber die Ballungsraeume.
 */
export function positionForId(id: string, cells: OriginCell[]): { x: number; y: number } {
  if (cells.length === 0) return symbolicPosition(id);

  const total = cells.reduce((sum, cell) => sum + cell.count, 0);
  if (total <= 0) return symbolicPosition(id);

  const random = seededRandom(hashString(`${id}:cell`));
  let pick = random() * total;
  let chosen = cells[cells.length - 1];

  for (const candidate of cells) {
    pick -= candidate.count;
    if (pick <= 0) {
      chosen = candidate;
      break;
    }
  }

  // Streuradius etwa eine halbe Zellbreite (~2,5 km).
  const spread = 2.5 / 111.32;
  const angle = random() * Math.PI * 2;
  const distance = Math.sqrt(random()) * spread;

  return projectToUnitSquare({
    lat: chosen.lat + Math.sin(angle) * distance,
    lon: chosen.lon + (Math.cos(angle) * distance) / latitudeScale,
  });
}

