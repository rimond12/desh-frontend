import React, { useState, useEffect } from 'react';
import { X, Send, Paperclip, ChevronRight, ChevronLeft } from 'lucide-react';
import useAxiosSecure from '../../hooks/useAxiosSecure';
import DynamicTicketForm from './DynamicTicketForm';
import toast from 'react-hot-toast';

export default function CreateTicketModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedProject = null,
  preselectedInput = null,
  preselectedQuestion = null,
}) {
  const axiosSecure = useAxiosSecure();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(
    preselectedQuestion?.projectId || preselectedProject || ''
  );
  const [formSchema, setFormSchema] = useState(null);

  const [subject, setSubject] = useState(
    preselectedQuestion?.questionSnapshot?.label
      ? `Clarification: ${preselectedQuestion.questionSnapshot.label.slice(0, 60)}`
      : ''
  );
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('clarification');
  const [type, setType] = useState('question');
  const [priority, setPriority] = useState('medium');
  const [dynamicFormData, setDynamicFormData] = useState({});
  const [files, setFiles] = useState([]);

  useEffect(() => {
    if (isOpen) {
      if (preselectedQuestion) {
        setSelectedProject(preselectedQuestion.projectId || '');
        if (preselectedQuestion.questionSnapshot?.label) {
          setSubject(`Clarification: ${preselectedQuestion.questionSnapshot.label.slice(0, 60)}`);
        }
      }

      // Load projects
      axiosSecure.get('/projects').then((res) => {
        setProjects(res.data.projects || res.data || []);
      }).catch(() => {});

      // Load form schema
      axiosSecure.get('/ticket-forms').then((res) => {
        setFormSchema(res.data.schema);
      }).catch(() => {});
    }
  }, [isOpen, preselectedQuestion, axiosSecure]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFiles([...files, ...Array.from(e.target.files)]);
    }
  };

  const removeFile = (idx) => {
    setFiles(files.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProject) return toast.error('Please select a project');
    if (!subject.trim()) return toast.error('Please enter a subject');
    if (!description.trim()) return toast.error('Please enter a description');

    setLoading(true);
    try {
      // 1. Create Ticket
      const payload = {
        projectId: selectedProject,
        tabId: preselectedQuestion?.tabId || null,
        moduleId: preselectedQuestion?.moduleId || null,
        sectionId: preselectedQuestion?.sectionId || null,
        inputId: preselectedQuestion?.inputId || preselectedInput || null,
        questionSnapshot: preselectedQuestion?.questionSnapshot || null,
        subject,
        description,
        category,
        type,
        priority,
        formData: dynamicFormData,
      };

      const res = await axiosSecure.post('/tickets', payload);
      const newTicket = res.data.ticket;

      // 2. Upload Attachments if any
      if (files.length > 0 && newTicket?._id) {
        const formData = new FormData();
        files.forEach((f) => formData.append('files', f));
        await axiosSecure.post(`/tickets/${newTicket._id}/attachments`, formData);
      }

      toast.success(`Ticket ${newTicket.ticketNumber} created successfully!`);
      if (onSuccess) onSuccess(newTicket);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay bg-black/60 backdrop-blur-sm">
      <div className="glass-card w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b bg-emerald-950/20" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--tx)' }}>
            Create Clarification Ticket
          </h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>

        {/* Step Bar */}
        <div className="flex items-center justify-center gap-4 py-3 px-6 bg-emerald-500/5 text-xs border-b" style={{ borderColor: 'var(--border)' }}>
          <span className={`font-semibold ${step >= 1 ? 'text-emerald-600' : 'text-gray-400'}`}>1. Project & Details</span>
          <ChevronRight size={14} className="text-gray-400" />
          <span className={`font-semibold ${step >= 2 ? 'text-emerald-600' : 'text-gray-400'}`}>2. Dynamic Fields & Files</span>
          <ChevronRight size={14} className="text-gray-400" />
          <span className={`font-semibold ${step >= 3 ? 'text-emerald-600' : 'text-gray-400'}`}>3. Review & Submit</span>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {step === 1 && (
            <div className="space-y-4 fade-in-up">
              {preselectedQuestion?.questionSnapshot && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300 mb-1">
                    <span>🎯</span> Linked Question Auto-Attached
                  </div>
                  <p className="text-gray-700 dark:text-gray-200">
                    <strong>Project:</strong> {preselectedQuestion.questionSnapshot.projectTitle || 'Current Project'} &bull; 
                    <strong> Location:</strong> {preselectedQuestion.questionSnapshot.tabTitle} &rarr; {preselectedQuestion.questionSnapshot.moduleTitle}
                  </p>
                  <p className="font-semibold text-emerald-900 dark:text-emerald-200 mt-1">
                    "{preselectedQuestion.questionSnapshot.label}"
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--tx-2)' }}>
                  Target Project <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="input-field w-full text-xs"
                  required
                >
                  <option value="">Select a project</option>
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--tx-2)' }}>
                  Subject / Topic <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Missing HVAC energy efficiency calculation calculation report"
                  className="input-field w-full text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--tx-2)' }}>Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field w-full text-xs">
                    <option value="clarification">Clarification</option>
                    <option value="missing_info">Missing Info</option>
                    <option value="correction">Correction</option>
                    <option value="general">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--tx-2)' }}>Type</label>
                  <select value={type} onChange={(e) => setType(e.target.value)} className="input-field w-full text-xs">
                    <option value="question">Question</option>
                    <option value="request">Request</option>
                    <option value="issue">Issue</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--tx-2)' }}>Priority</label>
                  <select value={priority} onChange={(e) => setPriority(e.target.value)} className="input-field w-full text-xs">
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--tx-2)' }}>
                  Detailed Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide complete details about what missing information or clarification is needed..."
                  className="input-field w-full text-xs"
                  required
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 fade-in-up">
              {formSchema && (
                <div className="mb-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-emerald-700">Custom Dynamic Fields</h4>
                  <DynamicTicketForm schema={formSchema} values={dynamicFormData} onChange={setDynamicFormData} />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--tx-2)' }}>Attachments / Supporting Documents</label>
                <div className="border-2 border-dashed border-emerald-500/30 p-4 rounded-xl text-center">
                  <input type="file" multiple onChange={handleFileChange} className="hidden" id="modal-file-input" />
                  <label htmlFor="modal-file-input" className="cursor-pointer text-xs font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1">
                    <Paperclip size={14} /> Click to upload files
                  </label>
                </div>

                {files.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3 text-xs">
                    {files.map((f, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 font-medium">
                        <Paperclip size={12} /> {f.name}
                        <button type="button" onClick={() => removeFile(i)} className="hover:text-red-600">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 fade-in-up text-xs">
              <div className="p-4 rounded-xl bg-emerald-500/10 space-y-2 border border-emerald-500/20">
                <h4 className="font-bold text-emerald-800 dark:text-emerald-300">Ticket Summary</h4>
                <p><strong>Subject:</strong> {subject}</p>
                <p><strong>Category:</strong> {category} | <strong>Priority:</strong> {priority.toUpperCase()}</p>
                <p><strong>Description:</strong> {description}</p>
                <p><strong>Attachments:</strong> {files.length} file(s)</p>
              </div>
            </div>
          )}

          {/* Modal Footer Buttons */}
          <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="btn-secondary text-xs px-4 py-2 inline-flex items-center gap-1"
              >
                <ChevronLeft size={14} /> Back
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1 && (!selectedProject || !subject || !description)) {
                    return toast.error('Please complete required fields');
                  }
                  setStep(step + 1);
                }}
                className="btn-primary-green text-xs px-4 py-2 inline-flex items-center gap-1"
              >
                Next <ChevronRight size={14} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="btn-primary-green text-xs px-5 py-2 inline-flex items-center gap-1.5"
              >
                <Send size={14} /> {loading ? 'Submitting...' : 'Submit Ticket'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
