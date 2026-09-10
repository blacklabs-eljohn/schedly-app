import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Folder, 
  FolderPlus, 
  Search, 
  UploadCloud, 
  FileText, 
  Presentation, 
  FileSpreadsheet, 
  Image as ImageIcon, 
  File, 
  Download, 
  Trash2, 
  Edit3, 
  ChevronRight, 
  ArrowLeft, 
  HardDrive, 
  Eye, 
  X, 
  Check, 
  Share2, 
  SlidersHorizontal, 
  Pin, 
  Activity, 
  Layers,
  ChevronLeft
} from 'lucide-react';
import { Course, AppFolder, AppStoredFile, SubjectCardTheme } from '../types';
import { 
  getAllStoredFiles, 
  getAllCustomFolders, 
  saveLocalFile, 
  deleteStoredFile, 
  renameStoredFile, 
  moveStoredFile, 
  createCustomFolder, 
  deleteCustomFolder, 
  renameCustomFolder, 
  downloadStoredFile, 
  getFileBlob, 
  formatFileSize, 
  getFileCategory, 
  FileCategory 
} from '../services/localFileStorageService';
import { triggerLightHaptic, triggerSelectionHaptic } from '../services/hapticsService';

interface FoldersViewProps {
  courses: Course[];
  subjectCardTheme?: SubjectCardTheme;
  onSelectCourse?: (course: Course) => void;
}

const FOLDER_COLORS = [
  '#0284C7', // Sky Blue
  '#2563EB', // Blue
  '#7C3AED', // Violet
  '#DB2777', // Pink
  '#DC2626', // Crimson
  '#EA580C', // Orange
  '#D97706', // Amber
  '#059669', // Emerald
  '#0D9488', // Teal
  '#475569'  // Slate
];

export const FoldersView: React.FC<FoldersViewProps> = ({
  courses,
  onSelectCourse
}) => {
  const [files, setFiles] = useState<AppStoredFile[]>([]);
  const [customFolders, setCustomFolders] = useState<AppFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null); // current folder drilled into
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null); // selected folder for info panel inspector
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<FileCategory | 'all'>('all');
  const [isUploading, setIsUploading] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(true);

  // Pinned Folders state (stored locally in localStorage)
  const [pinnedFolderIds, setPinnedFolderIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('schedly_pinned_folders');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const togglePinFolder = (folderKey: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    triggerLightHaptic();
    setPinnedFolderIds(prev => {
      const next = prev.includes(folderKey) ? prev.filter(k => k !== folderKey) : [...prev, folderKey];
      try {
        localStorage.setItem('schedly_pinned_folders', JSON.stringify(next));
      } catch (err) {
        console.error('Failed to save pinned folders:', err);
      }
      return next;
    });
  };

  // Double-tap tracker ref for touch and click
  const lastTapRef = useRef<{ id: string; time: number } | null>(null);

  const handleFolderCardClick = (folderKey: string) => {
    const now = Date.now();
    const last = lastTapRef.current;

    if (last && last.id === folderKey && now - last.time < 380) {
      // Double tap detected! Open the folder immediately
      triggerSelectionHaptic();
      setSelectedFolderId(folderKey);
      lastTapRef.current = null;
    } else {
      // Single tap: highlight folder and show its properties in Info inspector
      triggerLightHaptic();
      setActiveHighlightId(folderKey);
      lastTapRef.current = { id: folderKey, time: now };
    }
  };

  // Modals state
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[1]);

  // Rename modal
  const [renameTarget, setRenameTarget] = useState<{ type: 'file' | 'folder'; id: string; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Move file modal
  const [moveFileTarget, setMoveFileTarget] = useState<AppStoredFile | null>(null);

  // Preview modal
  const [previewFile, setPreviewFile] = useState<AppStoredFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load files and folders from IndexedDB
  const refreshData = async () => {
    try {
      const [loadedFiles, loadedFolders] = await Promise.all([
        getAllStoredFiles(),
        getAllCustomFolders()
      ]);
      setFiles(loadedFiles);
      setCustomFolders(loadedFolders);
      
      // Auto highlight first course if none highlighted
      if (!activeHighlightId && courses.length > 0) {
        setActiveHighlightId(`course_${courses[0].id}`);
      }
    } catch (err) {
      console.error('Failed to load local files:', err);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Compute active drilled-down folder info
  const currentDrilledFolder = useMemo(() => {
    if (!selectedFolderId) return null;
    if (selectedFolderId.startsWith('course_')) {
      const cId = selectedFolderId.replace('course_', '');
      const course = courses.find(c => c.id === cId);
      return course ? {
        id: selectedFolderId,
        name: `${course.courseCode} - ${course.courseName}`,
        shortName: course.courseCode,
        isCourse: true,
        course,
        color: course.color || '#2563EB',
        icon: course.icon
      } : null;
    } else {
      const f = customFolders.find(cf => cf.id === selectedFolderId);
      return f ? {
        id: f.id,
        name: f.name,
        shortName: f.name,
        isCourse: false,
        folder: f,
        color: f.color || '#0284C7',
        icon: f.icon
      } : null;
    }
  }, [selectedFolderId, courses, customFolders]);

  // Compute inspector info for active highlighted folder
  const inspectorFolder = useMemo(() => {
    const targetId = selectedFolderId || activeHighlightId;
    if (!targetId) return null;

    if (targetId.startsWith('course_')) {
      const cId = targetId.replace('course_', '');
      const course = courses.find(c => c.id === cId);
      if (!course) return null;

      const courseFilesList = files.filter(f => f.courseId === course.id);
      const totalSize = courseFilesList.reduce((acc, f) => acc + (f.size || 0), 0);
      const docFiles = courseFilesList.filter(f => ['docs', 'pdf'].includes(getFileCategory(f.extension)));
      const docBytes = docFiles.reduce((acc, f) => acc + (f.size || 0), 0);
      const mediaFiles = courseFilesList.filter(f => ['slides', 'sheets', 'image', 'other'].includes(getFileCategory(f.extension)));
      const mediaBytes = mediaFiles.reduce((acc, f) => acc + (f.size || 0), 0);

      return {
        id: targetId,
        name: `${course.courseCode} - ${course.courseName}`,
        shortName: course.courseCode,
        isCourse: true,
        course,
        color: course.color || '#2563EB',
        filesCount: courseFilesList.length,
        totalSizeFormatted: formatFileSize(totalSize),
        docSizeFormatted: formatFileSize(docBytes),
        mediaSizeFormatted: formatFileSize(mediaBytes),
        docPct: totalSize > 0 ? Math.round((docBytes / totalSize) * 100) : 50,
        mediaPct: totalSize > 0 ? Math.round((mediaBytes / totalSize) * 100) : 50,
        createdDate: 'Enrolled Term',
        lastModDate: courseFilesList[0] ? new Date(courseFilesList[0].createdAt).toLocaleDateString() : 'Today',
        tags: [
          { label: course.courseCode, color: '#2563EB' },
          { label: `Room ${course.room || 'TBA'}`, color: '#059669' },
          { label: `${course.instructor || 'Faculty'}`, color: '#EA580C' }
        ]
      };
    } else {
      const f = customFolders.find(cf => cf.id === targetId);
      if (!f) return null;

      const folderFilesList = files.filter(file => file.folderId === f.id);
      const totalSize = folderFilesList.reduce((acc, file) => acc + (file.size || 0), 0);
      const docFiles = folderFilesList.filter(file => ['docs', 'pdf'].includes(getFileCategory(file.extension)));
      const docBytes = docFiles.reduce((acc, file) => acc + (file.size || 0), 0);
      const mediaFiles = folderFilesList.filter(file => ['slides', 'sheets', 'image', 'other'].includes(getFileCategory(file.extension)));
      const mediaBytes = mediaFiles.reduce((acc, file) => acc + (file.size || 0), 0);

      return {
        id: targetId,
        name: f.name,
        shortName: f.name,
        isCourse: false,
        folder: f,
        color: f.color || '#0284C7',
        filesCount: folderFilesList.length,
        totalSizeFormatted: formatFileSize(totalSize),
        docSizeFormatted: formatFileSize(docBytes),
        mediaSizeFormatted: formatFileSize(mediaBytes),
        docPct: totalSize > 0 ? Math.round((docBytes / totalSize) * 100) : 60,
        mediaPct: totalSize > 0 ? Math.round((mediaBytes / totalSize) * 100) : 40,
        createdDate: new Date(f.createdAt).toLocaleDateString(),
        lastModDate: folderFilesList[0] ? new Date(folderFilesList[0].createdAt).toLocaleDateString() : 'Today',
        tags: [
          { label: 'Custom Folder', color: '#7C3AED' },
          { label: 'Offline Library', color: '#0284C7' }
        ]
      };
    }
  }, [selectedFolderId, activeHighlightId, courses, customFolders, files]);

  // Total storage metrics
  const storageStats = useMemo(() => {
    const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);
    const docBytes = files.filter(f => ['docs', 'pdf'].includes(getFileCategory(f.extension))).reduce((acc, f) => acc + (f.size || 0), 0);
    const mediaBytes = files.filter(f => ['slides', 'image', 'sheets', 'other'].includes(getFileCategory(f.extension))).reduce((acc, f) => acc + (f.size || 0), 0);

    return {
      totalBytes,
      formatted: formatFileSize(totalBytes),
      docFormatted: formatFileSize(docBytes),
      mediaFormatted: formatFileSize(mediaBytes),
      docPct: totalBytes > 0 ? Math.round((docBytes / totalBytes) * 100) : 65,
      mediaPct: totalBytes > 0 ? Math.round((mediaBytes / totalBytes) * 100) : 35,
      fileCount: files.length
    };
  }, [files]);

  // Filtered files list
  const filteredFiles = useMemo(() => {
    let result = files;

    if (selectedFolderId) {
      if (selectedFolderId.startsWith('course_')) {
        const cId = selectedFolderId.replace('course_', '');
        result = result.filter(f => f.courseId === cId);
      } else {
        result = result.filter(f => f.folderId === selectedFolderId);
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(f => 
        f.name.toLowerCase().includes(q) || 
        f.extension.toLowerCase().includes(q)
      );
    }

    if (activeCategory !== 'all') {
      result = result.filter(f => getFileCategory(f.extension) === activeCategory);
    }

    return result;
  }, [files, selectedFolderId, searchQuery, activeCategory]);

  // Compute files count & sizes per course/folder
  const folderStatsMap = useMemo(() => {
    const map: Record<string, { count: number; totalBytes: number; previewSnippet?: string }> = {};

    files.forEach(f => {
      if (f.courseId) {
        const key = `course_${f.courseId}`;
        if (!map[key]) map[key] = { count: 0, totalBytes: 0, previewSnippet: f.name };
        map[key].count += 1;
        map[key].totalBytes += (f.size || 0);
      }
      if (f.folderId) {
        const key = f.folderId;
        if (!map[key]) map[key] = { count: 0, totalBytes: 0, previewSnippet: f.name };
        map[key].count += 1;
        map[key].totalBytes += (f.size || 0);
      }
    });

    return map;
  }, [files]);

  // Handle file uploads
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    setIsUploading(true);
    triggerLightHaptic();

    try {
      let targetCourseId: string | undefined = undefined;
      let targetFolderId: string | undefined = undefined;

      if (selectedFolderId) {
        if (selectedFolderId.startsWith('course_')) {
          targetCourseId = selectedFolderId.replace('course_', '');
        } else {
          targetFolderId = selectedFolderId;
        }
      } else if (activeHighlightId) {
        if (activeHighlightId.startsWith('course_')) {
          targetCourseId = activeHighlightId.replace('course_', '');
        } else {
          targetFolderId = activeHighlightId;
        }
      }

      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        await saveLocalFile(file, file.name, {
          courseId: targetCourseId,
          folderId: targetFolderId
        });
      }

      await refreshData();
    } catch (err) {
      console.error('Error saving uploaded file:', err);
      alert('Could not save file locally. Please ensure device storage is available.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle file deletion
  const handleDeleteFile = async (file: AppStoredFile) => {
    if (!window.confirm(`Delete "${file.name}" from offline storage?`)) return;
    triggerLightHaptic();
    await deleteStoredFile(file.id);
    await refreshData();
    if (previewFile?.id === file.id) {
      handleClosePreview();
    }
  };

  // Handle custom folder creation
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    triggerLightHaptic();
    const created = await createCustomFolder(newFolderName.trim(), newFolderColor);
    setNewFolderName('');
    setIsNewFolderModalOpen(false);
    setActiveHighlightId(created.id);
    await refreshData();
  };

  // Handle folder deletion
  const handleDeleteFolder = async (folder: AppFolder) => {
    if (!window.confirm(`Delete folder "${folder.name}"? Contained files will remain in your general files library.`)) return;
    triggerLightHaptic();
    await deleteCustomFolder(folder.id);
    if (selectedFolderId === folder.id) {
      setSelectedFolderId(null);
    }
    if (activeHighlightId === folder.id) {
      setActiveHighlightId(null);
    }
    await refreshData();
  };

  // Handle renaming
  const handleSaveRename = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    triggerLightHaptic();

    if (renameTarget.type === 'file') {
      await renameStoredFile(renameTarget.id, renameValue.trim());
    } else {
      await renameCustomFolder(renameTarget.id, renameValue.trim());
    }

    setRenameTarget(null);
    setRenameValue('');
    await refreshData();
  };

  // Handle moving file
  const handleSaveMoveFile = async (targetCourseId?: string, targetFolderId?: string) => {
    if (!moveFileTarget) return;
    triggerLightHaptic();
    await moveStoredFile(moveFileTarget.id, {
      courseId: targetCourseId,
      folderId: targetFolderId
    });
    setMoveFileTarget(null);
    await refreshData();
  };

  // Handle Preview
  const handleOpenPreview = async (file: AppStoredFile) => {
    triggerSelectionHaptic();
    setPreviewFile(file);
    const blob = await getFileBlob(file.id);
    if (blob) {
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    }
  };

  const handleClosePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewFile(null);
    setPreviewUrl(null);
  };

  // Get icon and color badge for a file
  const getFileIconBadge = (file: AppStoredFile) => {
    const category = getFileCategory(file.extension);
    switch (category) {
      case 'slides':
        return {
          icon: <Presentation size={20} color="#EA580C" />,
          bg: '#FFF7ED',
          border: '#FED7AA',
          label: 'PPT / Slides',
          badgeColor: '#EA580C'
        };
      case 'pdf':
        return {
          icon: <FileText size={20} color="#DC2626" />,
          bg: '#FEF2F2',
          border: '#FECACA',
          label: 'PDF Document',
          badgeColor: '#DC2626'
        };
      case 'docs':
        return {
          icon: <FileText size={20} color="#2563EB" />,
          bg: '#EFF6FF',
          border: '#BFDBFE',
          label: 'Word / Text',
          badgeColor: '#2563EB'
        };
      case 'sheets':
        return {
          icon: <FileSpreadsheet size={20} color="#059669" />,
          bg: '#ECFDF5',
          border: '#A7F3D0',
          label: 'Spreadsheet',
          badgeColor: '#059669'
        };
      case 'image':
        return {
          icon: <ImageIcon size={20} color="#7C3AED" />,
          bg: '#F5F3FF',
          border: '#DDD6FE',
          label: 'Image',
          badgeColor: '#7C3AED'
        };
      default:
        return {
          icon: <File size={20} color="#64748B" />,
          bg: '#F8FAFC',
          border: '#E2E8F0',
          label: file.extension ? file.extension.toUpperCase() : 'File',
          badgeColor: '#64748B'
        };
    }
  };

  const renderFilesGrid = (filesList: AppStoredFile[]) => {
    if (filesList.length === 0) {
      return (
        <div 
          style={{ 
            padding: '44px 20px', 
            borderRadius: 18, 
            background: 'var(--ios-card-bg)', 
            border: '1px dashed var(--ios-card-border)', 
            textAlign: 'center' 
          }}
        >
          <UploadCloud size={32} color="var(--ios-text-muted)" style={{ margin: '0 auto 10px', display: 'block' }} />
          <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--ios-text-primary)', marginBottom: 4 }}>
            No files found
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ios-text-muted)', marginBottom: 14 }}>
            Upload PPT slides, PDF lecture notes, or docs to access them anytime offline.
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 10,
              background: 'var(--ios-blue)',
              color: '#FFFFFF',
              border: 'none',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <UploadCloud size={15} />
            <span>Upload File</span>
          </button>
        </div>
      );
    }

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {filesList.map(file => {
          const badge = getFileIconBadge(file);
          const course = courses.find(c => c.id === file.courseId);
          const folder = customFolders.find(cf => cf.id === file.folderId);
          const formattedDate = new Date(file.createdAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });

          return (
            <div
              key={file.id}
              style={{
                padding: '14px 16px',
                borderRadius: 14,
                background: 'var(--ios-card-bg)',
                border: '1px solid var(--ios-card-border)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 10,
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                position: 'relative'
              }}
              className="hover-card-elevation"
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div 
                  style={{ 
                    width: 40, 
                    height: 40, 
                    borderRadius: 10, 
                    background: badge.bg, 
                    border: `1px solid ${badge.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  {badge.icon}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div 
                    style={{ 
                      fontSize: 13.5, 
                      fontWeight: 700, 
                      color: 'var(--ios-text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                    title={file.name}
                  >
                    {file.name}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: badge.badgeColor }}>
                      {file.extension ? file.extension.toUpperCase() : 'FILE'}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--ios-text-muted)' }}>•</span>
                    <span style={{ fontSize: 11, color: 'var(--ios-text-muted)' }}>
                      {formatFileSize(file.size)}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--ios-text-muted)' }}>•</span>
                    <span style={{ fontSize: 11, color: 'var(--ios-text-muted)' }}>
                      {formattedDate}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--ios-card-border)', paddingTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => handleOpenPreview(file)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 8px',
                      borderRadius: 6,
                      background: 'var(--ios-bg-primary)',
                      border: '1px solid var(--ios-card-border)',
                      color: 'var(--ios-text-secondary)',
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <Eye size={12} />
                    <span>Preview</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerLightHaptic();
                      downloadStoredFile(file);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 8px',
                      borderRadius: 6,
                      background: 'var(--ios-bg-primary)',
                      border: '1px solid var(--ios-card-border)',
                      color: 'var(--ios-text-secondary)',
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                    title="Download"
                  >
                    <Download size={12} />
                    <span>Save</span>
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button
                    type="button"
                    onClick={() => {
                      triggerLightHaptic();
                      setRenameTarget({ type: 'file', id: file.id, name: file.name });
                      setRenameValue(file.name);
                    }}
                    style={{
                      padding: 4,
                      borderRadius: 6,
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--ios-text-muted)',
                      cursor: 'pointer'
                    }}
                    title="Rename"
                  >
                    <Edit3 size={13} />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerLightHaptic();
                      setMoveFileTarget(file);
                    }}
                    style={{
                      padding: 4,
                      borderRadius: 6,
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--ios-text-muted)',
                      cursor: 'pointer'
                    }}
                    title="Move"
                  >
                    <Folder size={13} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteFile(file)}
                    style={{
                      padding: 4,
                      borderRadius: 6,
                      background: 'transparent',
                      border: 'none',
                      color: '#DC2626',
                      cursor: 'pointer'
                    }}
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1480, margin: '0 auto' }}>
      {/* Hidden file upload input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        multiple
        style={{ display: 'none' }}
      />

      {/* ================= TOP BREADCRUMB & ACTION BAR (Kintsugi Style) ================= */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
        {/* Left Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {selectedFolderId ? (
            <button
              type="button"
              onClick={() => {
                triggerLightHaptic();
                setSelectedFolderId(null);
              }}
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: 'var(--ios-card-bg)',
                border: '1px solid var(--ios-card-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--ios-text-secondary)',
                cursor: 'pointer'
              }}
              title="Back to All Folders"
            >
              <ArrowLeft size={16} />
            </button>
          ) : (
            <div 
              style={{ 
                width: 34, 
                height: 34, 
                borderRadius: 10, 
                background: 'var(--ios-card-bg)', 
                border: '1px solid var(--ios-card-border)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'var(--ios-blue)'
              }}
            >
              <Folder size={18} />
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ios-text-muted)', fontWeight: 600 }}>
            <span>Projects & Courses</span>
            <ChevronRight size={14} />
            <span style={{ color: 'var(--ios-text-primary)', fontWeight: 800 }}>
              {currentDrilledFolder ? currentDrilledFolder.name : 'All Folders'}
            </span>
          </div>
        </div>

        {/* Right Top Actions (Manage, Share, New Folder, Upload) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={() => {
              triggerLightHaptic();
              setIsNewFolderModalOpen(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 10,
              background: 'var(--ios-card-bg)',
              border: '1px solid var(--ios-card-border)',
              color: 'var(--ios-text-primary)',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <FolderPlus size={15} color="var(--ios-blue)" />
            <span>New Folder</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerLightHaptic();
              fileInputRef.current?.click();
            }}
            disabled={isUploading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 10,
              background: '#0F172A',
              color: '#FFFFFF',
              border: 'none',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: isUploading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.25)',
              transition: 'all 0.15s ease',
              opacity: isUploading ? 0.7 : 1
            }}
          >
            <UploadCloud size={15} />
            <span>{isUploading ? 'Saving...' : 'Upload File'}</span>
          </button>
        </div>
      </div>

      {/* Main Split Layout: Folder Cards Grid on Left + Info Inspector on Right */}
      <div className="kintsugi-folders-layout">
        {/* ================= LEFT / MAIN STREAM ================= */}
        <div className="kintsugi-folders-main">
          {/* Main Title Header */}
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--ios-text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
              {currentDrilledFolder ? currentDrilledFolder.name : 'Course Workspaces & Folders'}
            </h1>
          </div>

          {/* Search + Filter Header Pill (Matching Screenshot) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: 420 }}>
              <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--ios-text-muted)' }} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 38px',
                  borderRadius: 12,
                  border: '1px solid var(--ios-card-border)',
                  background: 'var(--ios-card-bg)',
                  color: 'var(--ios-text-primary)',
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--ios-text-muted)', cursor: 'pointer' }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto' }}>
              {[
                { key: 'all', label: 'All' },
                { key: 'slides', label: 'Slides (PPT)' },
                { key: 'docs', label: 'Docs' },
                { key: 'pdf', label: 'PDFs' },
                { key: 'sheets', label: 'Sheets' },
                { key: 'image', label: 'Images' }
              ].map(cat => {
                const isActive = activeCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => {
                      triggerSelectionHaptic();
                      setActiveCategory(cat.key as any);
                    }}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid var(--ios-card-border)',
                      background: isActive ? 'var(--ios-text-primary)' : 'var(--ios-card-bg)',
                      color: isActive ? 'var(--ios-bg-primary)' : 'var(--ios-text-secondary)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ================= 3D FOLDER CARDS GRID ================= */}
          {selectedFolderId === null ? (
            <div>
              {/* Helper to render individual 3D liquid glass folder card */}
              {(() => {
                const renderCard = (
                  folderKey: string,
                  title: string,
                  subtitle: string,
                  totalBytes: number,
                  themeColor: string,
                  isCourse: boolean,
                  previewTop: string,
                  previewNote: string,
                  customFolderObj?: AppFolder
                ) => {
                  const isHighlighted = activeHighlightId === folderKey;
                  const isPinned = pinnedFolderIds.includes(folderKey);

                  return (
                    <div
                      key={folderKey}
                      className={`kintsugi-folder-card ${isHighlighted ? 'is-active' : ''}`}
                      style={{
                        '--folder-theme-start': isHighlighted ? themeColor : undefined,
                        '--folder-theme-end': isHighlighted ? `${themeColor}EE` : undefined
                      } as any}
                      onClick={() => handleFolderCardClick(folderKey)}
                      onDoubleClick={() => {
                        triggerSelectionHaptic();
                        setSelectedFolderId(folderKey);
                      }}
                      title="Single tap to inspect • Double tap to open"
                    >
                      {/* Pinned Badge indicator on top-right */}
                      {isPinned && (
                        <div className="folder-pinned-indicator">
                          <Pin size={10} style={{ fill: 'currentColor' }} />
                          <span>Pinned</span>
                        </div>
                      )}

                      {/* Back Tab with Liquid Glass */}
                      <div className="kintsugi-folder-back">
                        <div className="kintsugi-folder-back-tab" />
                      </div>

                      {/* Peeking Document Paper Sheet */}
                      <div className="kintsugi-folder-paper">
                        <div className="kintsugi-paper-text" style={{ fontWeight: 700 }}>
                          {previewTop}
                        </div>
                        <div className="kintsugi-paper-line" style={{ width: '88%' }} />
                        <div className="kintsugi-paper-line" style={{ width: '60%' }} />
                        <div className="kintsugi-paper-text" style={{ fontSize: 9, opacity: 0.7, marginTop: 2 }}>
                          {previewNote}
                        </div>
                      </div>

                      {/* Front Folder Pocket with Liquid Glass Effect */}
                      <div className="kintsugi-folder-front">
                        <div>
                          <div className="folder-card-title">{title}</div>
                          <div className="folder-card-subtitle">{subtitle}</div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                          <div className="folder-card-size">{formatFileSize(totalBytes)}</div>

                          {/* Quick Actions (Pin, Rename, Delete) */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                            {/* Pin Toggle Button */}
                            <button
                              type="button"
                              className={`folder-pin-btn ${isPinned ? 'is-pinned' : ''}`}
                              onClick={(e) => togglePinFolder(folderKey, e)}
                              title={isPinned ? 'Unpin from top' : 'Pin folder to top'}
                            >
                              <Pin size={13} style={{ fill: isPinned ? 'currentColor' : 'none' }} />
                            </button>

                            {/* Custom Folder Actions */}
                            {customFolderObj && (
                              <>
                                <button
                                  type="button"
                                  className="folder-pin-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    triggerLightHaptic();
                                    setRenameTarget({ type: 'folder', id: customFolderObj.id, name: customFolderObj.name });
                                    setRenameValue(customFolderObj.name);
                                  }}
                                  title="Rename folder"
                                >
                                  <Edit3 size={12} />
                                </button>
                                <button
                                  type="button"
                                  className="folder-pin-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteFolder(customFolderObj);
                                  }}
                                  title="Delete folder"
                                  style={{ color: isHighlighted ? '#FFFFFF' : '#DC2626' }}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                };

                // Filter lists for pinned and unpinned
                const pinnedCourses = courses.filter(c => pinnedFolderIds.includes(`course_${c.id}`));
                const pinnedCustoms = customFolders.filter(f => pinnedFolderIds.includes(f.id));
                const hasPinned = pinnedCourses.length > 0 || pinnedCustoms.length > 0;

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 28, marginBottom: 32 }}>
                    {/* 1. PINNED FOLDERS SECTION */}
                    {hasPinned && (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
                          <Pin size={15} color="#D97706" style={{ fill: '#D97706' }} />
                          <h2 style={{ fontSize: 13.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ios-text-secondary)', margin: 0 }}>
                            Pinned Folders ({pinnedCourses.length + pinnedCustoms.length})
                          </h2>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 20 }}>
                          {pinnedCourses.map(course => {
                            const folderKey = `course_${course.id}`;
                            const stats = folderStatsMap[folderKey] || { count: 0, totalBytes: 0, previewSnippet: '' };
                            return renderCard(
                              folderKey,
                              course.courseCode,
                              `${stats.count} ${stats.count === 1 ? 'file' : 'notes & files'}`,
                              stats.totalBytes,
                              course.color || '#2563EB',
                              true,
                              `${course.courseCode} - ${course.courseName}`,
                              stats.count > 0 ? `${stats.count} study files saved offline` : 'Double tap to open & upload',
                              undefined
                            );
                          })}
                          {pinnedCustoms.map(folder => {
                            const stats = folderStatsMap[folder.id] || { count: 0, totalBytes: 0, previewSnippet: '' };
                            return renderCard(
                              folder.id,
                              folder.name,
                              `${stats.count} ${stats.count === 1 ? 'file' : 'notes & files'}`,
                              stats.totalBytes,
                              folder.color || '#0284C7',
                              false,
                              `📁 ${folder.name}`,
                              stats.count > 0 ? `${stats.count} custom files saved` : 'Double tap to open & upload',
                              folder
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 2. COURSE WORKSPACES */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                        <h2 style={{ fontSize: 13.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ios-text-secondary)', margin: 0 }}>
                          Course Workspaces ({courses.length})
                        </h2>
                        <span style={{ fontSize: 11.5, color: 'var(--ios-text-muted)', fontWeight: 600 }}>
                          Double tap to open • Tap to inspect
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 20 }}>
                        {courses.map(course => {
                          const folderKey = `course_${course.id}`;
                          const stats = folderStatsMap[folderKey] || { count: 0, totalBytes: 0, previewSnippet: '' };
                          return renderCard(
                            folderKey,
                            course.courseCode,
                            `${stats.count} ${stats.count === 1 ? 'file' : 'notes & files'}`,
                            stats.totalBytes,
                            course.color || '#2563EB',
                            true,
                            `${course.courseCode} - ${course.courseName}`,
                            stats.count > 0 ? `${stats.count} study files saved offline` : 'Double tap to open & upload',
                            undefined
                          );
                        })}
                      </div>
                    </div>

                    {/* 3. CUSTOM FOLDERS */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                        <h2 style={{ fontSize: 13.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ios-text-secondary)', margin: 0 }}>
                          Custom Folders ({customFolders.length})
                        </h2>
                        <button
                          type="button"
                          onClick={() => {
                            triggerLightHaptic();
                            setIsNewFolderModalOpen(true);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--ios-blue)',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <FolderPlus size={13} />
                          <span>+ New Folder</span>
                        </button>
                      </div>

                      {customFolders.length === 0 ? (
                        <div 
                          style={{ 
                            padding: '24px 20px', 
                            borderRadius: 18, 
                            border: '1px dashed var(--ios-card-border)', 
                            textAlign: 'center',
                            color: 'var(--ios-text-muted)',
                            fontSize: 12.5
                          }}
                        >
                          No custom folders created yet. Tap <strong>+ New Folder</strong> above to create one.
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 20 }}>
                          {customFolders.map(folder => {
                            const stats = folderStatsMap[folder.id] || { count: 0, totalBytes: 0, previewSnippet: '' };
                            return renderCard(
                              folder.id,
                              folder.name,
                              `${stats.count} ${stats.count === 1 ? 'file' : 'notes & files'}`,
                              stats.totalBytes,
                              folder.color || '#0284C7',
                              false,
                              `📁 ${folder.name}`,
                              stats.count > 0 ? `${stats.count} custom files saved` : 'Double tap to open & upload',
                              folder
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* All Files List Stream */}
              <div style={{ marginTop: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--ios-text-primary)', margin: 0 }}>
                    Recent Stored Materials ({filteredFiles.length})
                  </h3>
                </div>

                {renderFilesGrid(filteredFiles)}
              </div>
            </div>
          ) : (
            /* ================= DRILLED INTO FOLDER VIEW ================= */
            <div>
              <div 
                style={{ 
                  padding: '18px 22px', 
                  borderRadius: 18, 
                  background: 'var(--ios-card-bg)', 
                  border: '1px solid var(--ios-card-border)',
                  marginBottom: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div 
                    style={{ 
                      width: 44, 
                      height: 44, 
                      borderRadius: 14, 
                      background: `${currentDrilledFolder?.color || 'var(--ios-blue)'}15`,
                      color: currentDrilledFolder?.color || 'var(--ios-blue)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Folder size={24} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--ios-text-primary)', margin: 0 }}>
                      {currentDrilledFolder?.name}
                    </h2>
                    <div style={{ fontSize: 12, color: 'var(--ios-text-muted)', marginTop: 2 }}>
                      {filteredFiles.length} files • {formatFileSize(filteredFiles.reduce((acc, f) => acc + (f.size || 0), 0))} (Stored 100% offline)
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {currentDrilledFolder?.isCourse && onSelectCourse && (
                    <button
                      type="button"
                      onClick={() => onSelectCourse(currentDrilledFolder.course!)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 10,
                        background: 'var(--ios-bg-secondary)',
                        border: '1px solid var(--ios-card-border)',
                        color: 'var(--ios-text-primary)',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Go to Course Hub →
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 16px',
                      borderRadius: 10,
                      background: 'var(--ios-blue)',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <UploadCloud size={15} />
                    <span>Upload to this Folder</span>
                  </button>
                </div>
              </div>

              {renderFilesGrid(filteredFiles)}
            </div>
          )}
        </div>

        {/* ================= RIGHT "INFO" INSPECTOR SIDE PANEL (Matching Screenshot) ================= */}
        {showInfoPanel && (
          <aside className="kintsugi-info-panel">
            {/* Header */}
            <div className="kintsugi-info-header">
              <h2 className="kintsugi-info-title">Info</h2>
              <button
                type="button"
                className="kintsugi-info-toggle-btn"
                onClick={() => {
                  triggerLightHaptic();
                  setShowInfoPanel(false);
                }}
                title="Collapse Info Panel"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Storage Metric Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Documents Metric */}
              <div className="kintsugi-metric-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="metric-card-label">Documents & PDFs</span>
                </div>
                <div className="metric-card-value">
                  {inspectorFolder ? inspectorFolder.docSizeFormatted : storageStats.docFormatted}
                </div>
                <div className="metric-progress-track">
                  <div className="metric-progress-bar" style={{ width: `${inspectorFolder ? inspectorFolder.docPct : storageStats.docPct}%`, background: '#3B82F6' }} />
                </div>
              </div>

              {/* Images & Slides Metric */}
              <div className="kintsugi-metric-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="metric-card-label">Presentations & Media</span>
                </div>
                <div className="metric-card-value">
                  {inspectorFolder ? inspectorFolder.mediaSizeFormatted : storageStats.mediaFormatted}
                </div>
                <div className="metric-progress-track">
                  <div className="metric-progress-bar" style={{ width: `${inspectorFolder ? inspectorFolder.mediaPct : storageStats.mediaPct}%`, background: '#EF4444' }} />
                </div>
              </div>
            </div>

            {/* Properties List */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ios-text-primary)', marginBottom: 12 }}>
                Properties
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--ios-text-muted)' }}>Total Size</span>
                  <span style={{ fontWeight: 700, color: 'var(--ios-text-primary)' }}>
                    {inspectorFolder ? inspectorFolder.totalSizeFormatted : storageStats.formatted}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--ios-text-muted)' }}>Files Count</span>
                  <span style={{ fontWeight: 700, color: 'var(--ios-text-primary)' }}>
                    {inspectorFolder ? inspectorFolder.filesCount : storageStats.fileCount} files
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--ios-text-muted)' }}>Created</span>
                  <span style={{ fontWeight: 700, color: 'var(--ios-text-primary)' }}>
                    {inspectorFolder ? inspectorFolder.createdDate : 'This Semester'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--ios-text-muted)' }}>Last modification</span>
                  <span style={{ fontWeight: 700, color: 'var(--ios-text-primary)' }}>
                    {inspectorFolder ? inspectorFolder.lastModDate : 'Today'}
                  </span>
                </div>
              </div>
            </div>

            {/* Tags / Badges (Matching Screenshot) */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ios-text-primary)', marginBottom: 10 }}>
                Tags & Details
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {(inspectorFolder?.tags || [
                  { label: '• Schedly Offline', color: '#2563EB' },
                  { label: '• Local IndexedDB', color: '#059669' },
                  { label: '• Zero Cloud Cost', color: '#EA580C' }
                ]).map((tag, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '4px 9px',
                      borderRadius: 8,
                      background: 'var(--ios-bg-primary)',
                      border: '1px solid var(--ios-card-border)',
                      color: tag.color
                    }}
                  >
                    {tag.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Quick Actions Footer with Pinned Vault */}
            <div style={{ borderTop: '1px solid var(--ios-card-border)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  fontSize: 12.5, 
                  fontWeight: 600, 
                  color: 'var(--ios-text-secondary)',
                  cursor: 'pointer' 
                }}
                onClick={() => {
                  triggerLightHaptic();
                  if (pinnedFolderIds.length > 0) {
                    setActiveHighlightId(pinnedFolderIds[0]);
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Pin size={14} color={pinnedFolderIds.length > 0 ? '#D97706' : 'var(--ios-text-muted)'} style={{ fill: pinnedFolderIds.length > 0 ? '#D97706' : 'none' }} />
                  <span>Pinned Items ({pinnedFolderIds.length})</span>
                </div>
                {pinnedFolderIds.length > 0 && (
                  <span style={{ fontSize: 11, color: '#D97706', fontWeight: 700 }}>Active</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, color: 'var(--ios-text-secondary)' }}>
                <Activity size={14} color="var(--ios-text-muted)" />
                <span>100% Offline Vault</span>
              </div>
            </div>
          </aside>
        )}

        {!showInfoPanel && (
          <button
            type="button"
            onClick={() => {
              triggerLightHaptic();
              setShowInfoPanel(true);
            }}
            style={{
              position: 'fixed',
              right: 24,
              bottom: 24,
              zIndex: 90,
              padding: '10px 16px',
              borderRadius: 14,
              background: 'var(--ios-card-bg)',
              border: '1px solid var(--ios-card-border)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--ios-text-primary)',
              cursor: 'pointer'
            }}
          >
            <ChevronLeft size={16} />
            <span>Show Info Panel</span>
          </button>
        )}
      </div>

      {/* ================= MODAL: CREATE NEW FOLDER ================= */}
      {isNewFolderModalOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20
          }}
          onClick={() => setIsNewFolderModalOpen(false)}
        >
          <div 
            style={{
              background: 'var(--ios-card-bg)',
              border: '1px solid var(--ios-card-border)',
              borderRadius: 20,
              padding: 24,
              width: '100%',
              maxWidth: 420,
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${newFolderColor}20`, color: newFolderColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FolderPlus size={20} />
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: 'var(--ios-text-primary)' }}>Create Folder</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewFolderModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--ios-text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateFolder}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ios-text-secondary)', marginBottom: 6 }}>
                  Folder Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Reviewers, Midterm PPTs, Thesis..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  autoFocus
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 12,
                    border: '1px solid var(--ios-card-border)',
                    background: 'var(--ios-bg-primary)',
                    color: 'var(--ios-text-primary)',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ios-text-secondary)', marginBottom: 8 }}>
                  Folder Accent Color
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {FOLDER_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewFolderColor(c)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: c,
                        border: newFolderColor === c ? '2px solid #FFFFFF' : 'none',
                        boxShadow: newFolderColor === c ? `0 0 0 2px ${c}` : 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFFFFF'
                      }}
                    >
                      {newFolderColor === c && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setIsNewFolderModalOpen(false)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: 10,
                    background: 'transparent',
                    border: '1px solid var(--ios-card-border)',
                    color: 'var(--ios-text-secondary)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newFolderName.trim()}
                  style={{
                    padding: '9px 20px',
                    borderRadius: 10,
                    background: newFolderColor,
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: newFolderName.trim() ? 'pointer' : 'not-allowed',
                    opacity: newFolderName.trim() ? 1 : 0.6
                  }}
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: RENAME ================= */}
      {renameTarget && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20
          }}
          onClick={() => setRenameTarget(null)}
        >
          <div 
            style={{
              background: 'var(--ios-card-bg)',
              border: '1px solid var(--ios-card-border)',
              borderRadius: 20,
              padding: 24,
              width: '100%',
              maxWidth: 400,
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', color: 'var(--ios-text-primary)' }}>
              Rename {renameTarget.type === 'file' ? 'File' : 'Folder'}
            </h3>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 12,
                border: '1px solid var(--ios-card-border)',
                background: 'var(--ios-bg-primary)',
                color: 'var(--ios-text-primary)',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: 20
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setRenameTarget(null)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 10,
                  background: 'transparent',
                  border: '1px solid var(--ios-card-border)',
                  color: 'var(--ios-text-secondary)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRename}
                disabled={!renameValue.trim()}
                style={{
                  padding: '8px 18px',
                  borderRadius: 10,
                  background: 'var(--ios-blue)',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: MOVE FILE ================= */}
      {moveFileTarget && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20
          }}
          onClick={() => setMoveFileTarget(null)}
        >
          <div 
            style={{
              background: 'var(--ios-card-bg)',
              border: '1px solid var(--ios-card-border)',
              borderRadius: 20,
              padding: 24,
              width: '100%',
              maxWidth: 440,
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px', color: 'var(--ios-text-primary)' }}>
              Move "{moveFileTarget.name}"
            </h3>
            <p style={{ fontSize: 12.5, color: 'var(--ios-text-muted)', margin: '0 0 16px' }}>
              Choose a Course or Custom Folder to organize this file:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {/* Option: General / No Folder */}
              <button
                type="button"
                onClick={() => handleSaveMoveFile(undefined, undefined)}
                style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: (!moveFileTarget.courseId && !moveFileTarget.folderId) ? 'var(--ios-blue-light, rgba(0,122,255,0.12))' : 'var(--ios-bg-primary)',
                  border: '1px solid var(--ios-card-border)',
                  color: 'var(--ios-text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <Folder size={16} color="var(--ios-text-muted)" />
                <span style={{ fontSize: 13, fontWeight: 600 }}>Root / General Library (No Folder)</span>
              </button>

              {/* Course Folders */}
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ios-text-muted)', marginTop: 8 }}>COURSE FOLDERS</div>
              {courses.map(course => (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => handleSaveMoveFile(course.id, undefined)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: moveFileTarget.courseId === course.id ? `${course.color || '#2563EB'}20` : 'var(--ios-bg-primary)',
                    border: '1px solid var(--ios-card-border)',
                    color: 'var(--ios-text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <Folder size={16} color={course.color || '#2563EB'} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{course.courseCode}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ios-text-muted)' }}>{course.courseName}</div>
                  </div>
                </button>
              ))}

              {/* Custom Folders */}
              {customFolders.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ios-text-muted)', marginTop: 8 }}>CUSTOM FOLDERS</div>
                  {customFolders.map(cf => (
                    <button
                      key={cf.id}
                      type="button"
                      onClick={() => handleSaveMoveFile(undefined, cf.id)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 10,
                        background: moveFileTarget.folderId === cf.id ? `${cf.color || '#0284C7'}20` : 'var(--ios-bg-primary)',
                        border: '1px solid var(--ios-card-border)',
                        color: 'var(--ios-text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <Folder size={16} color={cf.color || '#0284C7'} />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{cf.name}</span>
                    </button>
                  ))}
                </>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setMoveFileTarget(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 10,
                  background: 'transparent',
                  border: '1px solid var(--ios-card-border)',
                  color: 'var(--ios-text-secondary)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: FILE PREVIEW ================= */}
      {previewFile && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: 24
          }}
          onClick={handleClosePreview}
        >
          <div 
            style={{
              background: 'var(--ios-card-bg)',
              border: '1px solid var(--ios-card-border)',
              borderRadius: 24,
              width: '100%',
              maxWidth: 900,
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--ios-card-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                {getFileIconBadge(previewFile).icon}
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ios-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 500 }}>
                    {previewFile.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ios-text-muted)' }}>
                    {formatFileSize(previewFile.size)} • Stored locally on device
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => downloadStoredFile(previewFile)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 14px',
                    borderRadius: 10,
                    background: 'var(--ios-blue)',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <Download size={14} />
                  <span>Download</span>
                </button>

                <button
                  type="button"
                  onClick={handleClosePreview}
                  style={{
                    padding: 8,
                    borderRadius: 10,
                    background: 'var(--ios-bg-primary)',
                    border: '1px solid var(--ios-card-border)',
                    color: 'var(--ios-text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Preview Body */}
            <div style={{ flex: 1, padding: 24, overflowY: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, background: 'var(--ios-bg-primary)' }}>
              {previewFile.extension.toLowerCase() === 'pdf' && previewUrl ? (
                <iframe
                  src={previewUrl}
                  title={previewFile.name}
                  style={{ width: '100%', height: '70vh', border: 'none', borderRadius: 12 }}
                />
              ) : ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(previewFile.extension.toLowerCase()) && previewUrl ? (
                <img
                  src={previewUrl}
                  alt={previewFile.name}
                  style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 12 }}
                />
              ) : (
                <div style={{ textAlign: 'center', maxWidth: 460, padding: 32 }}>
                  <div style={{ width: 64, height: 64, borderRadius: 20, background: getFileIconBadge(previewFile).bg, border: `1px solid ${getFileIconBadge(previewFile).border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    {getFileIconBadge(previewFile).icon}
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ios-text-primary)', margin: '0 0 8px' }}>
                    {previewFile.name}
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--ios-text-muted)', margin: '0 0 20px', lineHeight: 1.5 }}>
                    This {previewFile.extension.toUpperCase()} document is securely saved in your offline storage. You can download and open it directly with Microsoft Office, Google Slides, Keynote, or your favorite viewer app.
                  </p>
                  <button
                    type="button"
                    onClick={() => downloadStoredFile(previewFile)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 22px',
                      borderRadius: 12,
                      background: 'var(--ios-blue)',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: 13.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(0, 122, 255, 0.25)'
                    }}
                  >
                    <Download size={16} />
                    <span>Download & Open in App</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FoldersView;
