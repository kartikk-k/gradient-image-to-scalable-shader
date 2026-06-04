export interface Preset {
  id: string;
  label: string;
  dataURL: string;
  w: number;
  h: number;
}

export const PRESETS: Preset[] = [
  {
    id: "sunset",
    label: "Sunset",
    dataURL: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAABH0lEQVR42mP4X2T8K9fyW4b9p2TXd3HeryIDn4WEP/KPveeZfMsl65p9wSWrsnOmNccM6/bo12zSrWL4k2/+I8v2S6rzhwTP11H+z0NDHwdE3/dOvO2Wcd0x77JNyXnzqlNG9QcMarfqVa/WqWT4mW39Nc3xY6L72xjfl+HBT4MiH/rG3/VIu+Gcc8Wu6IJFxRnjusOGtTv1q9frVi7RLmcg3jErtCvmaZYxEO+YhVrl0zVKGIh3zCzN0gnqxQzEO2ayekmnahED8Y7pVStqUilgIN4xbaqFNcr5DMQ7pl65oFQxj4F4x1Qo5eUp5DAQ75hChdx0uWwG4h2TLZ+TIJvFQLxjUuSyomQyGIh3TKxMZrBUOgPxjgmTzvCRTAMANPNjYbWc5asAAAAASUVORK5CYII=",
    w: 16,
    h: 16,
  },
  {
    id: "ocean",
    label: "Ocean",
    dataURL: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAABvklEQVR42n3NaVOOUQAG4PPlPctzzrNvbzNmGMaebez7vqWoJEkq1RRFUURRFDVFUSpSURQ1RXEzGGaY4YMvfpR/cK4/cJGUf0j+RfIP4l+IfyD6iugTwjmEMwgmEYzDH4U/DO8pvCdwH4EkfyP+ifg7oi+IgHAW4TSCNwhewX8B/zm8AXi9cLvhdsJpA4m/IfqM6APCdwinEEwgGIM/An8QXj+8HrhdcDvg3IN9B/YtEM3uPoDTDqcVdjPsRlj1sGpBNLvTArsJdgOsa7CuwLwE8wKIZrduwKqDWQOzCqoCqnROFc8QzW5Ww6yEKocqmVVF07LgrTzzmmh2VfZRnX+vCqfk2QmZNyZPjRjZg0Szy3OTMn9cnh6VOcNG1jPjeJ9x7DHR7DL3pXFyyMgcMDJ6RVq3ONwpDrQRzW6c6DfSe8TRLnGoQ+y/z/fc5TtvE80ujjwUB9vFvla+u5nvaORb69mmWqLZxd4WvquJb2/gW66zjVfZusts9UWi2fm2m3xzHdtQw9ZWsVUVdEUpXVpENDtbX83WVLLUcrq8hC4ppIvyEwtyiWanK8vosmK6uIAuzEvMz0nMy0ykpP8HOeIVqXoTca8AAAAASUVORK5CYII=",
    w: 16,
    h: 16,
  },
  {
    id: "aurora",
    label: "Aurora",
    dataURL: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAACIklEQVR42n2MXU/SYRyGn69hEYFgIG8GWVqmleaciTlnWmmWllkR6SoLNU1bsZwVw5w1hwLhayiG4nyBfCtUKFcnddhh36Prf9SWW9t18Lvv+3oekfK7ce8vu+znvX3fHfuTHYp4t2LjqXLtGXAQKeXfWhHQkIXsx335ThuDctWZutSrirjUYbd65rVE2E2kVK44EeQ77chC8fmJMvZcFXmlDvWnTbw9EPBofF7NsE/C5yVSqqf7EdCQhWrOlRYcYNAO+dPfjOn63utcU/qXIeAgUmo9fullcABZaN4NaQcDur5J/YsZgzNi7F4wdS6bHkUlOpeJlPreGQQ0ZKFzBw09Yclrjx1sWTc3x832bYstARxEyoy2j9LLnjCyMHYtZjhWGCy3kpkNX7LqE0evbB+7vAUcRErLzSRChmMVWZibNi2NX7Pqkzm1W3nV8VPnPxVUrp8+J8FBpGRCQEMW2XWJ45c2GQor1orLVkpKY6Ul0bNnloGDSMmEgIYs8qs2ispXGcqKlyoKF6ry5y+cjFw8MQccREomBDRkYbXGyosWKwvmMWpzPtRlh64emb52eAo4iJTVebMIaFZrVPBHTe4sQ0Pm1A3zpM00bjeM3dGPAgeRkgmhJjeMLLiuHwraTBNNutG7mkCL2v8w1etQSnAQKZkQ0JPFA5WuXD/3j7QYBDVn839vNHxKOUdb/LolrAAAAAElFTkSuQmCC",
    w: 16,
    h: 16,
  },
  {
    id: "peach",
    label: "Peach",
    dataURL: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAoElEQVR42mP4f2P/vyu7/17Y9uf0pt/H1/06vOrn/qU/dy/8sW3u902zv62b8nXVhC9Lez4v7Pg8t/nTzHoGklR/mFrHQJLqd5NqGUhS/bavhoEk1a+7axhIUv2yo5qBJNUvWqoYSFL9rLGSgSTVT2orGEhS/aiqnIEk1Q/LyxlIUn2/uIyBJNV3C0oZSFJ9J6eEgSTVtzKLGUhSfSOtCADhOBKPVMW1rQAAAABJRU5ErkJggg==",
    w: 16,
    h: 16,
  },
  {
    id: "midnight",
    label: "Midnight",
    dataURL: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAABOklEQVR42oXN204CQRhA4X97ne11drYDYu+9IyJibzG+/4vIBkXDxXD/5RzodL7a7c9W66Ou36rqpSyfiuIhz0dZNkzTASH9JOlhfBFFZ2F4EgRHUNfvVfVals9F8Zjn91k2StMhIYMk6WPci+MpPfT9fc/bhd/kXZbdpukNIddJcoXxZRyfR9FpGB5PqetuO84mUO6+f+B5e6674zhbtr1hWWumuQKU+yRp2+uWtWqay4axiNACUO7/aBehjq63Na0FlLthLCHU1fUfqmm1qlZAuY+drjdO0ypVLVW1UJQcKPdJckwVpaGynMlyCpT7DJUkIkkJUO6K8udEEYtiLAgRzE1OqSCEPB/APNo4QQh43ud5j+NcoNwnyTHluIayrMOyNlDuM5RhLIYxgXLnuMaxbOMYxgBAAPo3jcFIX8qmNh4AAAAASUVORK5CYII=",
    w: 16,
    h: 16,
  },
];

export const ASPECT_RATIOS = [
  { id: "auto", label: "Auto" },
  { id: "16:9", label: "16:9" },
  { id: "4:3", label: "4:3" },
  { id: "1:1", label: "1:1" },
  { id: "3:4", label: "3:4" },
  { id: "9:16", label: "9:16" },
] as const;

export function getAspectValue(id: string, imgW: number, imgH: number): number {
  switch (id) {
    case "16:9": return 16 / 9;
    case "4:3": return 4 / 3;
    case "1:1": return 1;
    case "3:4": return 3 / 4;
    case "9:16": return 9 / 16;
    default: return imgW / imgH;
  }
}
