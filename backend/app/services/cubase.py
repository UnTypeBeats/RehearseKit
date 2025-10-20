import os
import xml.etree.ElementTree as ET
from xml.dom import minidom
from pathlib import Path
import zipfile
import uuid


class CubaseProjectGenerator:
    """
    Generate DAW project files
    
    Creates .dawproject files (open interchange format supported by Cubase, 
    Bitwig, and other modern DAWs)
    """
    
    def generate_project(self, stems_dir: str, project_name: str, bpm: float) -> str:
        """
        Generate a DAWproject file (.dawproject)
        
        DAWproject is an open interchange format supported by Cubase, Bitwig,
        PreSonus Studio One, and other modern DAWs.
        
        Format: ZIP file containing:
          - project.xml (project structure)
          - metadata.xml (project metadata)
          - audio/ folder with stem files
        """
        
        # Create XML structure
        root = ET.Element("Project", version="1.0")
        
        # Application info
        app = ET.SubElement(root, "Application")
        app.set("name", "RehearseKit")
        app.set("version", "1.0")
        
        # Transport (tempo and time signature)
        transport = ET.SubElement(root, "Transport")
        
        # Sample rate at transport level (Studio One reads this)
        sample_rate_transport = ET.SubElement(transport, "SampleRate")
        sample_rate_transport.set("value", "48000")
        sample_rate_transport.set("min", "8000")
        sample_rate_transport.set("max", "192000")
        sample_rate_transport.set("unit", "hertz")
        sample_rate_transport.text = "48000"
        
        # Tempo
        tempo_elem = ET.SubElement(transport, "Tempo")
        tempo_elem.set("value", str(bpm))
        tempo_elem.set("min", "20.0")
        tempo_elem.set("max", "999.0")
        tempo_elem.set("unit", "bpm")
        tempo_elem.set("id", f"tempo_{uuid.uuid4().hex[:8]}")
        tempo_elem.set("name", "Tempo")
        
        # Time signature
        ts_elem = ET.SubElement(transport, "TimeSignature")
        ts_elem.set("numerator", "4")
        ts_elem.set("denominator", "4")
        ts_elem.set("id", f"timesig_{uuid.uuid4().hex[:8]}")
        
        # Structure (tracks)
        structure = ET.SubElement(root, "Structure")
        
        # Master track
        master_id = f"master_{uuid.uuid4().hex[:8]}"
        master = ET.SubElement(structure, "Track")
        master.set("loaded", "true")
        master.set("id", master_id)
        master.set("name", "Master")
        master.set("contentType", "audio notes")
        
        master_channel = ET.SubElement(master, "Channel")
        master_channel.set("audioChannels", "2")
        master_channel.set("role", "master")
        master_channel.set("solo", "false")
        master_channel.set("id", f"{master_id}_channel")
        
        # Master volume/pan
        vol_elem = ET.SubElement(master_channel, "Volume")
        vol_elem.set("value", "1.0")
        vol_elem.set("min", "0.0")
        vol_elem.set("max", "2.0")
        vol_elem.set("unit", "linear")
        vol_elem.set("id", f"{master_id}_vol")
        vol_elem.set("name", "Volume")
        
        # Color mapping for stems
        stem_colors = {
            "vocals": "#FF6B9D",
            "drums": "#FFA500",
            "bass": "#4169E1",
            "guitar": "#32CD32",
            "keys": "#9370DB",
            "other": "#808080",
        }
        
        # Add a track for each stem
        stem_files = sorted(Path(stems_dir).glob("*.wav"))
        track_ids = []
        
        for idx, stem_file in enumerate(stem_files):
            stem_name = stem_file.stem
            track_id = f"track_{uuid.uuid4().hex[:8]}"
            track_ids.append(track_id)
            
            track = ET.SubElement(structure, "Track")
            track.set("loaded", "true")
            track.set("id", track_id)
            track.set("name", stem_name.capitalize())
            track.set("contentType", "audio")
            track.set("color", stem_colors.get(stem_name.lower(), "#808080"))
            
            # Channel
            channel = ET.SubElement(track, "Channel")
            channel.set("audioChannels", "2")
            channel.set("destination", master_id)
            channel.set("role", "regular")
            channel.set("solo", "false")
            channel.set("id", f"{track_id}_channel")
            
            # Volume
            vol = ET.SubElement(channel, "Volume")
            vol.set("value", "0.8")
            vol.set("min", "0.0")
            vol.set("max", "2.0")
            vol.set("unit", "linear")
            vol.set("id", f"{track_id}_vol")
            vol.set("name", "Volume")
            
            # Pan
            pan = ET.SubElement(channel, "Pan")
            pan.set("value", "0.5")  # Center
            pan.set("min", "0.0")
            pan.set("max", "1.0")
            pan.set("unit", "normalized")
            pan.set("id", f"{track_id}_pan")
            pan.set("name", "Pan")
        
        # Arrangement
        arrangement = ET.SubElement(root, "Arrangement")
        arrangement.set("id", f"arr_{uuid.uuid4().hex[:8]}")
        
        lanes = ET.SubElement(arrangement, "Lanes")
        lanes.set("timeUnit", "beats")
        lanes.set("id", f"lanes_{uuid.uuid4().hex[:8]}")
        
        # Add clips for each audio track
        for idx, (stem_file, track_id) in enumerate(zip(stem_files, track_ids)):
            track_lanes = ET.SubElement(lanes, "Lanes")
            track_lanes.set("track", track_id)
            track_lanes.set("id", f"lane_{track_id}")
            
            clips = ET.SubElement(track_lanes, "Clips")
            clips.set("id", f"clips_{track_id}")
            
            clip = ET.SubElement(clips, "Clip")
            clip.set("time", "0.0")
            clip.set("duration", "auto")
            clip.set("playStart", "0.0")
            clip.set("name", stem_file.stem.capitalize())
            
            # Audio reference
            audio = ET.SubElement(clip, "Audio")
            audio.set("sampleRate", "48000")
            audio.set("channels", "2")
            audio.set("algorithm", "stretch")
            audio.set("id", f"audio_{track_id}")
            
            file_ref = ET.SubElement(audio, "File")
            file_ref.set("path", f"audio/{stem_file.name}")
        
        # Convert to pretty XML
        xml_str = ET.tostring(root, encoding='unicode')
        dom = minidom.parseString(xml_str)
        pretty_xml = dom.toprettyxml(indent="  ")
        
        # Create DAWproject package (ZIP file)
        output_dir = os.path.dirname(stems_dir)
        dawproject_path = os.path.join(output_dir, f"{project_name}.dawproject")
        
        with zipfile.ZipFile(dawproject_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # Add project.xml
            zipf.writestr("project.xml", pretty_xml)
            
            # Add metadata.xml
            metadata = self._generate_metadata(project_name)
            zipf.writestr("metadata.xml", metadata)
            
            # Add audio files
            for stem_file in stem_files:
                zipf.write(stem_file, f"audio/{stem_file.name}")
        
        return dawproject_path
    
    def _generate_metadata(self, project_name: str) -> str:
        """Generate metadata.xml for DAWproject"""
        metadata = ET.Element("MetaData")
        
        title = ET.SubElement(metadata, "Title")
        title.text = project_name
        
        app = ET.SubElement(metadata, "Application")
        app.text = "RehearseKit"
        
        comment = ET.SubElement(metadata, "Comment")
        comment.text = "Generated by RehearseKit - Your Complete Rehearsal Toolkit"
        
        xml_str = ET.tostring(metadata, encoding='unicode')
        dom = minidom.parseString(xml_str)
        return dom.toprettyxml(indent="  ")
    
    def generate_from_template(self, template_path: str, stems_dir: str, bpm: float) -> str:
        """
        Alternative method: Use a template Cubase project and modify it
        
        This would be more reliable for production use, as you'd have a known-good
        Cubase project template that you modify programmatically.
        """
        # TODO: Implement template-based generation
        pass

