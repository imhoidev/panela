import customtkinter as ctk
import tkinter as tk
from tkinter import font
import random
import time
import math

# Configuração Global de Aparência
ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("dark-blue")

class HardwareSimulator:
"""Gera dados fictícios realistas com flutuações naturais."""

def __init__(self):
# Estado inicial
self.cpu_load = 15.0
self.gpu_load = 10.0
self.ram_used = 12.0 # GB
self.cpu_temp = 45.0
self.gpu_temp = 35.0
self.cpu_clock = 4200 # MHz
self.gpu_clock = 2100 # MHz

# Limites Fictícios do Hardware
self.max_cpu_temp = 95.0
self.max_gpu_temp = 88.0
self.base_cpu_clock = 4200
self.max_cpu_clock = 5700
self.base_gpu_clock = 2100
self.max_gpu_clock = 3200

def update(self):
# Lógica de simulação de carga (Random Walk com inércia)
# CPU
target_cpu = random.uniform(10, 98)
self.cpu_load += (target_cpu - self.cpu_load) * 0.05
self.cpu_load = max(5, min(99.9, self.cpu_load))

# GPU (mais volátil)
if random.random() > 0.7:
target_gpu = random.uniform(40, 100)
else:
target_gpu = random.uniform(10, 40)
self.gpu_load += (target_gpu - self.gpu_load) * 0.1
self.gpu_load = max(0, min(100, self.gpu_load))

# RAM (oscilação lenta)
base_ram = 64.0
fluctuation = math.sin(time.time() * 0.5) * 20
self.ram_used = base_ram + fluctuation + random.uniform(-2, 2)

# Temperaturas (baseadas na carga)
self.cpu_temp = 35 + (self.cpu_load * 0.6) + random.uniform(-1, 1)
self.gpu_temp = 30 + (self.gpu_load * 0.55) + random.uniform(-1, 1)

# Clocks (sobem com carga, caem com thermal throttling simulado)
cpu_boost = (self.cpu_load / 100) * (self.max_cpu_clock - self.base_cpu_clock)
self.cpu_clock = self.base_cpu_clock + cpu_boost - (max(0, self.cpu_temp - 85) * 50)

gpu_boost = (self.gpu_load / 100) * (self.max_gpu_clock - self.base_gpu_clock)
self.gpu_clock = self.base_gpu_clock + gpu_boost - (max(0, self.gpu_temp - 80) * 40)

return {
"cpu_load": self.cpu_load,
"gpu_load": self.gpu_load,
"ram_used": self.ram_used,
"cpu_temp": self.cpu_temp,
"gpu_temp": self.gpu_temp,
"cpu_clock": self.cpu_clock,
"gpu_clock": self.gpu_clock
}

class GraphCanvas(ctk.CTkCanvas):
"""Desenha gráficos de linha em tempo real sem bibliotecas externas pesadas."""
def __init__(self, parent, color, height=100):
super().__init__(parent, bg="#1a1a1a", highlightthickness=0, height=height)
self.color = color
self.data_points = <span class="citation-group citation-pending"><span class="citation-pill">0</span></span> * 100
self.current_index = 0
self.max_val = 100
self.line_ids = []

def update_data(self, value):
self.data_points.pop(0)
self.data_points.append(value)
self.draw_graph()

def draw_graph(self):
self.delete("all")
width = self.winfo_width()
height = self.winfo_height()
if width < 2: return

step = width / len(self.data_points)
points = []

for i, val in enumerate(self.data_points):
x = i * step
y = height - (val / self.max_val) * height
points.extend([x, y])

if len(points) > 2:
self.create_line(points, fill=self.color, width=2, smooth=True)

# Preenchimento gradiente abaixo da linha
if len(points) > 2:
fill_points = [points,<span class="citation-group citation-pending"><span class="citation-pill">0</span></span> height] + points + [points[-2], height]
self.create_polygon(fill_points, fill=self.color, outline="", stipple="gray50", tags="bg")
# Ajuste de transparência manual não suportado nativamente no Canvas tkinter simples,
# então usamos apenas a linha para performance e clareza.

class App(ctk.CTk):
def __init__(self):
super().__init__()

self.title("SYSTEM MONITOR ULTIMATE - BUILD SIMULATION")
self.geometry("1100x700")
self.minsize(900, 600)

self.simulator = HardwareSimulator()
self.update_id = None

self.configure_layout()
self.schedule_update()

def configure_layout(self):
# Grid configuration
self.grid_columnconfigure(0, weight=1)
self.grid_columnconfigure(1, weight=1)
self.grid_rowconfigure(1, weight=1)

# Header
header_frame = ctk.CTkFrame(self, fg_color="#0d0d0d", height=60)
header_frame.grid(row=0, column=0, columnspan=2, sticky="ew", padx=10, pady=10)
header_frame.grid_propagate(False)

lbl_title = ctk.CTkLabel(header_frame, text="NEXUS CONTROL PANEL // RTX 5090 ACTIVE",
font=ctk.CTkFont(family="Consolas", size=16, weight="bold"),
text_color="#00ff9d")
lbl_title.pack(side="left", padx=20, pady=15)

self.lbl_status = ctk.CTkLabel(header_frame, text="STATUS: OPTIMAL",
font=ctk.CTkFont(family="Consolas", size=12),
text_color="#00ff9d")
lbl_uptime = ctk.CTkLabel(header_frame, text="UPTIME: 00:42:15",
font=ctk.CTkFont(family="Consolas", size=12),
text_color="#888888")
lbl_uptime.pack(side="right", padx=20)
self.lbl_status.pack(side="right", padx=20)

# Main Content Area
# Left Panel: CPU & RAM
left_panel = ctk.CTkFrame(self, fg_color="#121212", corner_radius=8)
left_panel.grid(row=1, column=0, sticky="nsew", padx=10, pady=5)

# Right Panel: GPU & Storage
right_panel = ctk.CTkFrame(self, fg_color="#121212", corner_radius=8)
right_panel.grid(row=1, column=1, sticky="nsew", padx=10, pady=5)

self.create_cpu_section(left_panel)
self.create_ram_section(left_panel)
self.create_gpu_section(right_panel)
self.create_storage_section(right_panel)

def create_component_card(self, parent, title, row, col, rowspan=1, colspan=1):
frame = ctk.CTkFrame(parent, fg_color="#1a1a1a", corner_radius=6)
frame.grid(row=row, column=col, rowspan=rowspan, columnspan=colspan, sticky="nsew", padx=10, pady=10)
frame.grid_columnconfigure(0, weight=1)
frame.grid_rowconfigure(1, weight=1)

lbl_title = ctk.CTkLabel(frame, text=title, font=ctk.CTkFont(family="Segoe UI", size=14, weight="bold"),
anchor="w", text_color="#ffffff")
lbl_title.grid(row=0, column=0, sticky="w", padx=15, pady=(15, 5))

content_frame = ctk.CTkFrame(frame, fg_color="transparent")
content_frame.grid(row=1, column=0, sticky="nsew", padx=15, pady=5)

return content_frame

def create_metric_row(self, parent, label_text, value_text, row_idx, color="#ffffff"):
frm = ctk.CTkFrame(parent, fg_color="transparent")
frm.pack(fill="x", pady=2)

lbl_name = ctk.CTkLabel(frm, text=label_text, font=ctk.CTkFont(family="Consolas", size=11),
text_color="#aaaaaa", anchor="w")
lbl_name.pack(side="left")

lbl_val = ctk.CTkLabel(frm, text=value_text, font=ctk.CTkFont(family="Consolas", size=11, weight="bold"),
text_color=color, anchor="e")
lbl_val.pack(side="right")

return lbl_val # Retorna referência para atualização

def create_cpu_section(self, parent):
card = self.create_component_card(parent, "PROCESSOR // AMD RYZEN 9 9950X3D", 0, 0, rowspan=1, colspan=1)

# Metrics
self.cpu_load_lbl = self.create_metric_row(card, "UTILIZAÇÃO GLOBAL", "0.0%", 0, "#00ff9d")
self.cpu_temp_lbl = self.create_metric_row(card, "TEMPERATURA PACOTE", "0.0°C", 1, "#ff4444")
self.cpu_clock_lbl = self.create_metric_row(card, "CLOCK ATUAL", "0 MHz", 2, "#00ccff")
self.cpu_power_lbl = self.create_metric_row(card, "CONSUMO (PPT)", "0 W", 3, "#ffaa00")

# Graph
self.cpu_graph = GraphCanvas(card, "#00ff9d", height=80)
self.cpu_graph.pack(fill="x", side="bottom", pady=10)
card.grid_rowconfigure(2, weight=1) # Espaço para o gráfico

def create_ram_section(self, parent):
card = self.create_component_card(parent, "MEMORY // 128GB DDR5 6400MHz", 1, 0, rowspan=1, colspan=1)

self.ram_used_lbl = self.create_metric_row(card, "EM USO", "0.0 GB", 0, "#bf00ff")
self.ram_total_lbl = self.create_metric_row(card, "TOTAL DISPONÍVEL", "128.0 GB", 1, "#ffffff")
self.ram_speed_lbl = self.create_metric_row(card, "VELOCIDADE EFETIVA", "0 MT/s", 2, "#00ccff")

self.ram_graph = GraphCanvas(card, "#bf00ff", height=60)
self.ram_graph.pack(fill="x", side="bottom", pady=10)

def create_gpu_section(self, parent):
card = self.create_component_card(parent, "GRAPHICS // NVIDIA GEFORCE RTX 5090", 0, 0, rowspan=1, colspan=1)

self.gpu_load_lbl = self.create_metric_row(card, "UTILIZAÇÃO GPU", "0.0%", 0, "#76b900") # Nvidia Green-ish
self.gpu_temp_lbl = self.create_metric_row(card, "TEMPERATURA GPU", "0.0°C", 1, "#ff4444")
self.gpu_clock_lbl = self.create_metric_row(card, "CORE CLOCK", "0 MHz", 2, "#00ccff")
self.gpu_mem_lbl = self.create_metric_row(card, "VRAM USAGE", "0 / 32 GB", 3, "#ffaa00")
self.gpu_power_lbl = self.create_metric_row(card, "TGP (POWER)", "0 W", 4, "#ff4444")

self.gpu_graph = GraphCanvas(card, "#76b900", height=100)
self.gpu_graph.pack(fill="x", side="bottom", pady=10)

def create_storage_section(self, parent):
card = self.create_component_card(parent, "STORAGE // NVME GEN5 CLUSTER", 1, 0, rowspan=1, colspan=1)

drives = [
("C: ", "4TB NVMe", "1.2 TB", "32°C"),
("D: ", "4TB NVMe", "3.8 TB", "38°C"),
("E: ", "2TB NVMe", "0.4 TB", "29°C"),
("F: ", "1TB NVMe", "0.8 TB", "41°C")
]

for i, (vol, name, used, temp) in enumerate(drives):
frm = ctk.CTkFrame(card, fg_color="#252525", corner_radius=4)
frm.pack(fill="x", pady=4)

lbl_vol = ctk.CTkLabel(frm, text=vol, font=ctk.CTkFont(family="Consolas", size=10, weight="bold"), text_color="#00ccff")
lbl_vol.pack(side="left", padx=10)

lbl_name = ctk.CTkLabel(frm, text=name, font=ctk.CTkFont(family="Consolas", size=10), text_color="#cccccc")
lbl_name.pack(side="left", padx=10)

lbl_used = ctk.CTkLabel(frm, text=used, font=ctk.CTkFont(family="Consolas", size=10), text_color="#ffffff")
lbl_used.pack(side="right", padx=10)

lbl_temp = ctk.CTkLabel(frm, text=temp, font=ctk.CTkFont(family="Consolas", size=10), text_color="#888888")
lbl_temp.pack(side="right", padx=10)

def update_dashboard(self):
data = self.simulator.update()

# CPU Updates
self.cpu_load_lbl.configure(text=f"{data['cpu_load']:.1f}%")
self.cpu_temp_lbl.configure(text=f"{data['cpu_temp']:.1f}°C")
self.cpu_clock_lbl.configure(text=f"{data['cpu_clock']:.0f} MHz")
# Power fake calculation: Base 80W + Load factor
cpu_power = 80 + (data['cpu_load'] * 2.8)
self.cpu_power_lbl.configure(text=f"{cpu_power:.0f} W")
self.cpu_graph.update_data(data['cpu_load'])

# RAM Updates
self.ram_used_lbl.configure(text=f"{data['ram_used']:.1f} GB")
ram_speed = 6400 + random.randint(-50, 50)
self.ram_speed_lbl.configure(text=f"{ram_speed} MT/s")
# Normaliza RAM para gráfico (0-128GB)
self.ram_graph.update_data((data['ram_used'] / 128.0) * 100)

# GPU Updates
self.gpu_load_lbl.configure(text=f"{data['gpu_load']:.1f}%")
self.gpu_temp_lbl.configure(text=f"{data['gpu_temp']:.1f}°C")
self.gpu_clock_lbl.configure(text=f"{data['gpu_clock']:.0f} MHz")
# VRAM fake
vram_used = 12 + (data['gpu_load'] * 0.18)
self.gpu_mem_lbl.configure(text=f"{vram_used:.1f} / 32 GB")
gpu_power = 45 + (data['gpu_load'] * 4.5)
self.gpu_power_lbl.configure(text=f"{gpu_power:.0f} W")
self.gpu_graph.update_data(data['gpu_load'])

# Agendar próxima atualização (aprox 16ms para ~60fps visual)
self.update_id = self.after(100, self.update_dashboard)

def schedule_update(self):
self.update_dashboard()

def on_close(self):
if self.update_id:
self.after_cancel(self.update_id)
self.destroy()

if __name__ == "__main__":
app = App()
app.protocol("WM_DELETE_WINDOW", app.on_close)
app.mainloop()
