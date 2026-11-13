-- Seed 8 Employees and Accounts for Goldsun ERP
BEGIN;

DO $$
DECLARE
    v_sys_actor UUID := '01a14802-9765-7cdb-922e-357b570d1809';
    v_pw_hash TEXT := '$2a$12$KHc6zV6cXV6QqD4naSB2c.K1fjkLZNHqcMSph3gJyiXjchx1ElMRa'; -- Admin@123
    v_admin_id UUID := '09da7c89-2fe4-4b78-b164-6762c70521fd';
    v_admin_seq UUID := '01a147e8-bfdf-7033-a10a-ff08dcb56c8f';
    v_emp_tuan_seq UUID := '01a1bb30-f368-72ad-9e02-b0b20813fcdf';

    -- New IDs
    v_id_khiem UUID := gen_random_uuid();
    v_seq_khiem UUID := "_SYSUUIDv7"();
    v_emp_khiem UUID := "_SYSUUIDv7"();

    v_id_ninh UUID := gen_random_uuid();
    v_seq_ninh UUID := "_SYSUUIDv7"();
    v_emp_ninh UUID := "_SYSUUIDv7"();

    v_id_bau UUID := gen_random_uuid();
    v_seq_bau UUID := "_SYSUUIDv7"();
    v_emp_bau UUID := "_SYSUUIDv7"();

    v_id_phuong UUID := gen_random_uuid();
    v_seq_phuong UUID := "_SYSUUIDv7"();
    v_emp_phuong UUID := "_SYSUUIDv7"();

    v_id_thuong UUID := gen_random_uuid();
    v_seq_thuong UUID := "_SYSUUIDv7"();
    v_emp_thuong UUID := "_SYSUUIDv7"();

    v_id_binh UUID := gen_random_uuid();
    v_seq_binh UUID := "_SYSUUIDv7"();
    v_emp_binh UUID := "_SYSUUIDv7"();

    v_id_minh UUID := gen_random_uuid();
    v_seq_minh UUID := "_SYSUUIDv7"();
    v_emp_minh UUID := "_SYSUUIDv7"();

BEGIN
    -- 1. CẬP NHẬT HOÀNG VĂN TUẤN (GS.52546) - TÀI KHOẢN ADMIN HIỆN TẠI
    UPDATE "_USRAccountDirectory"
    SET "Username" = 'gs.52546',
        "Position" = 'Nhân viên Quản trị hệ thống',
        "JobRole" = 'Quản trị viên Hệ thống ERP & CNTT',
        "UpdatedAt" = now()
    WHERE "Id" = v_admin_id;

    UPDATE "_HRMEmployeeDirectory"
    SET "Code" = 'GS.52546',
        "FullName" = 'Hoàng Văn Tuấn',
        "Position" = 'Nhân viên Quản trị hệ thống',
        "UpdatedAt" = now()
    WHERE "IdSeq" = v_emp_tuan_seq OR "UserId" = v_admin_id;

    -- 2. GS.01991 - NGUYỄN VĂN KHIÊM (Phó phòng CNTT - Manager)
    INSERT INTO "_USRAccountDirectory" (
        "Id", "IdSeq", "Username", "Email", "Name", "PasswordHash", "Role",
        "Department", "Position", "JobRole", "Enabled", "Approved", "RegistrationSource",
        "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt"
    ) VALUES (
        v_id_khiem, v_seq_khiem, 'gs.01991', 'gs.01991@goldsunpackaging.vn', 'Nguyễn Văn Khiêm', v_pw_hash, 'manager',
        'Phòng ban Quản trị ERP & CNTT', 'Phó phòng Công nghệ thông tin', 'Phó phòng CNTT', true, true, 'admin',
        v_sys_actor, v_sys_actor, now(), now()
    ) ON CONFLICT ("Username") DO UPDATE SET
        "Name" = excluded."Name",
        "Position" = excluded."Position",
        "Role" = excluded."Role",
        "UpdatedAt" = now();

    INSERT INTO "_SYSActorDirectory" ("IdSeq", "ActorType", "AccountSeq", "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt")
    VALUES (v_seq_khiem, 'USER', v_seq_khiem, v_sys_actor, v_sys_actor, now(), now())
    ON CONFLICT ("IdSeq") DO NOTHING;

    INSERT INTO "_HRMEmployeeDirectory" (
        "IdSeq", "Code", "FullName", "Department", "Position", "DelegationLevel", "Status", "UserId",
        "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt"
    ) VALUES (
        v_emp_khiem, 'GS.01991', 'Nguyễn Văn Khiêm', 'Phòng ban Quản trị ERP & CNTT', 'Phó phòng Công nghệ thông tin',
        'department', 'active', v_id_khiem, v_sys_actor, v_sys_actor, now(), now()
    ) ON CONFLICT ("Code") DO UPDATE SET
        "FullName" = excluded."FullName",
        "Position" = excluded."Position",
        "UserId" = v_id_khiem,
        "UpdatedAt" = now();

    INSERT INTO "_SECGroupMember" ("GroupKey", "UserId", "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt")
    VALUES ('dept_manager', v_id_khiem, v_sys_actor, v_sys_actor, now(), now())
    ON CONFLICT ("GroupKey", "UserId") DO NOTHING;

    -- 3. GS.60119 - NGUYỄN QUANG NINH (Chuyên viên CNTT)
    INSERT INTO "_USRAccountDirectory" (
        "Id", "IdSeq", "Username", "Email", "Name", "PasswordHash", "Role",
        "Department", "Position", "JobRole", "Enabled", "Approved", "RegistrationSource",
        "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt"
    ) VALUES (
        v_id_ninh, v_seq_ninh, 'gs.60119', 'gs.60119@goldsunpackaging.vn', 'Nguyễn Quang Ninh', v_pw_hash, 'employee',
        'Phòng ban Quản trị ERP & CNTT', 'Chuyên viên CNTT', 'Chuyên viên CNTT', true, true, 'admin',
        v_sys_actor, v_sys_actor, now(), now()
    ) ON CONFLICT ("Username") DO UPDATE SET
        "Name" = excluded."Name",
        "Position" = excluded."Position",
        "UpdatedAt" = now();

    INSERT INTO "_SYSActorDirectory" ("IdSeq", "ActorType", "AccountSeq", "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt")
    VALUES (v_seq_ninh, 'USER', v_seq_ninh, v_sys_actor, v_sys_actor, now(), now())
    ON CONFLICT ("IdSeq") DO NOTHING;

    INSERT INTO "_HRMEmployeeDirectory" (
        "IdSeq", "Code", "FullName", "Department", "Position", "DelegationLevel", "Status", "UserId",
        "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt"
    ) VALUES (
        v_emp_ninh, 'GS.60119', 'Nguyễn Quang Ninh', 'Phòng ban Quản trị ERP & CNTT', 'Chuyên viên CNTT',
        'department', 'active', v_id_ninh, v_sys_actor, v_sys_actor, now(), now()
    ) ON CONFLICT ("Code") DO UPDATE SET
        "FullName" = excluded."FullName",
        "Position" = excluded."Position",
        "UserId" = v_id_ninh,
        "UpdatedAt" = now();

    INSERT INTO "_SECGroupMember" ("GroupKey", "UserId", "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt")
    VALUES ('employee', v_id_ninh, v_sys_actor, v_sys_actor, now(), now())
    ON CONFLICT ("GroupKey", "UserId") DO NOTHING;

    -- 4. GS.29650 - PHAN VĂN BẦU (Chuyên viên CNTT)
    INSERT INTO "_USRAccountDirectory" (
        "Id", "IdSeq", "Username", "Email", "Name", "PasswordHash", "Role",
        "Department", "Position", "JobRole", "Enabled", "Approved", "RegistrationSource",
        "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt"
    ) VALUES (
        v_id_bau, v_seq_bau, 'gs.29650', 'gs.29650@goldsunpackaging.vn', 'Phan Văn Bầu', v_pw_hash, 'employee',
        'Phòng ban Quản trị ERP & CNTT', 'Chuyên viên CNTT', 'Chuyên viên CNTT', true, true, 'admin',
        v_sys_actor, v_sys_actor, now(), now()
    ) ON CONFLICT ("Username") DO UPDATE SET
        "Name" = excluded."Name",
        "Position" = excluded."Position",
        "UpdatedAt" = now();

    INSERT INTO "_SYSActorDirectory" ("IdSeq", "ActorType", "AccountSeq", "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt")
    VALUES (v_seq_bau, 'USER', v_seq_bau, v_sys_actor, v_sys_actor, now(), now())
    ON CONFLICT ("IdSeq") DO NOTHING;

    INSERT INTO "_HRMEmployeeDirectory" (
        "IdSeq", "Code", "FullName", "Department", "Position", "DelegationLevel", "Status", "UserId",
        "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt"
    ) VALUES (
        v_emp_bau, 'GS.29650', 'Phan Văn Bầu', 'Phòng ban Quản trị ERP & CNTT', 'Chuyên viên CNTT',
        'department', 'active', v_id_bau, v_sys_actor, v_sys_actor, now(), now()
    ) ON CONFLICT ("Code") DO UPDATE SET
        "FullName" = excluded."FullName",
        "Position" = excluded."Position",
        "UserId" = v_id_bau,
        "UpdatedAt" = now();

    INSERT INTO "_SECGroupMember" ("GroupKey", "UserId", "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt")
    VALUES ('employee', v_id_bau, v_sys_actor, v_sys_actor, now(), now())
    ON CONFLICT ("GroupKey", "UserId") DO NOTHING;

    -- 5. GS.21630 - TRẦN THỊ ANH PHƯƠNG (Trưởng bộ phận Quản trị hệ thống - Manager)
    INSERT INTO "_USRAccountDirectory" (
        "Id", "IdSeq", "Username", "Email", "Name", "PasswordHash", "Role",
        "Department", "Position", "JobRole", "Enabled", "Approved", "RegistrationSource",
        "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt"
    ) VALUES (
        v_id_phuong, v_seq_phuong, 'gs.21630', 'gs.21630@goldsunpackaging.vn', 'Trần Thị Anh Phương', v_pw_hash, 'manager',
        'Phòng ban Quản trị ERP & CNTT', 'Trưởng bộ phận Quản trị hệ thống', 'Trưởng bộ phận', true, true, 'admin',
        v_sys_actor, v_sys_actor, now(), now()
    ) ON CONFLICT ("Username") DO UPDATE SET
        "Name" = excluded."Name",
        "Position" = excluded."Position",
        "Role" = excluded."Role",
        "UpdatedAt" = now();

    INSERT INTO "_SYSActorDirectory" ("IdSeq", "ActorType", "AccountSeq", "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt")
    VALUES (v_seq_phuong, 'USER', v_seq_phuong, v_sys_actor, v_sys_actor, now(), now())
    ON CONFLICT ("IdSeq") DO NOTHING;

    INSERT INTO "_HRMEmployeeDirectory" (
        "IdSeq", "Code", "FullName", "Department", "Position", "DelegationLevel", "Status", "UserId",
        "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt"
    ) VALUES (
        v_emp_phuong, 'GS.21630', 'Trần Thị Anh Phương', 'Phòng ban Quản trị ERP & CNTT', 'Trưởng bộ phận Quản trị hệ thống',
        'department', 'active', v_id_phuong, v_sys_actor, v_sys_actor, now(), now()
    ) ON CONFLICT ("Code") DO UPDATE SET
        "FullName" = excluded."FullName",
        "Position" = excluded."Position",
        "UserId" = v_id_phuong,
        "UpdatedAt" = now();

    INSERT INTO "_SECGroupMember" ("GroupKey", "UserId", "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt")
    VALUES ('dept_manager', v_id_phuong, v_sys_actor, v_sys_actor, now(), now())
    ON CONFLICT ("GroupKey", "UserId") DO NOTHING;

    -- 6. GS.31340 - NGUYỄN THỊ THƯƠNG (Nhân viên Quản trị hệ thống)
    INSERT INTO "_USRAccountDirectory" (
        "Id", "IdSeq", "Username", "Email", "Name", "PasswordHash", "Role",
        "Department", "Position", "JobRole", "Enabled", "Approved", "RegistrationSource",
        "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt"
    ) VALUES (
        v_id_thuong, v_seq_thuong, 'gs.31340', 'gs.31340@goldsunpackaging.vn', 'Nguyễn Thị Thương', v_pw_hash, 'employee',
        'Phòng ban Quản trị ERP & CNTT', 'Nhân viên Quản trị hệ thống', 'Nhân viên Quản trị hệ thống', true, true, 'admin',
        v_sys_actor, v_sys_actor, now(), now()
    ) ON CONFLICT ("Username") DO UPDATE SET
        "Name" = excluded."Name",
        "Position" = excluded."Position",
        "UpdatedAt" = now();

    INSERT INTO "_SYSActorDirectory" ("IdSeq", "ActorType", "AccountSeq", "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt")
    VALUES (v_seq_thuong, 'USER', v_seq_thuong, v_sys_actor, v_sys_actor, now(), now())
    ON CONFLICT ("IdSeq") DO NOTHING;

    INSERT INTO "_HRMEmployeeDirectory" (
        "IdSeq", "Code", "FullName", "Department", "Position", "DelegationLevel", "Status", "UserId",
        "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt"
    ) VALUES (
        v_emp_thuong, 'GS.31340', 'Nguyễn Thị Thương', 'Phòng ban Quản trị ERP & CNTT', 'Nhân viên Quản trị hệ thống',
        'department', 'active', v_id_thuong, v_sys_actor, v_sys_actor, now(), now()
    ) ON CONFLICT ("Code") DO UPDATE SET
        "FullName" = excluded."FullName",
        "Position" = excluded."Position",
        "UserId" = v_id_thuong,
        "UpdatedAt" = now();

    INSERT INTO "_SECGroupMember" ("GroupKey", "UserId", "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt")
    VALUES ('employee', v_id_thuong, v_sys_actor, v_sys_actor, now(), now())
    ON CONFLICT ("GroupKey", "UserId") DO NOTHING;

    -- 7. GS.52080 - NGUYỄN ĐÌNH BÌNH (Chuyên viên Quản trị hệ thống)
    INSERT INTO "_USRAccountDirectory" (
        "Id", "IdSeq", "Username", "Email", "Name", "PasswordHash", "Role",
        "Department", "Position", "JobRole", "Enabled", "Approved", "RegistrationSource",
        "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt"
    ) VALUES (
        v_id_binh, v_seq_binh, 'gs.52080', 'gs.52080@goldsunpackaging.vn', 'Nguyễn Đình Bình', v_pw_hash, 'employee',
        'Phòng ban Quản trị ERP & CNTT', 'Chuyên viên Quản trị hệ thống', 'Chuyên viên Quản trị hệ thống', true, true, 'admin',
        v_sys_actor, v_sys_actor, now(), now()
    ) ON CONFLICT ("Username") DO UPDATE SET
        "Name" = excluded."Name",
        "Position" = excluded."Position",
        "UpdatedAt" = now();

    INSERT INTO "_SYSActorDirectory" ("IdSeq", "ActorType", "AccountSeq", "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt")
    VALUES (v_seq_binh, 'USER', v_seq_binh, v_sys_actor, v_sys_actor, now(), now())
    ON CONFLICT ("IdSeq") DO NOTHING;

    INSERT INTO "_HRMEmployeeDirectory" (
        "IdSeq", "Code", "FullName", "Department", "Position", "DelegationLevel", "Status", "UserId",
        "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt"
    ) VALUES (
        v_emp_binh, 'GS.52080', 'Nguyễn Đình Bình', 'Phòng ban Quản trị ERP & CNTT', 'Chuyên viên Quản trị hệ thống',
        'department', 'active', v_id_binh, v_sys_actor, v_sys_actor, now(), now()
    ) ON CONFLICT ("Code") DO UPDATE SET
        "FullName" = excluded."FullName",
        "Position" = excluded."Position",
        "UserId" = v_id_binh,
        "UpdatedAt" = now();

    INSERT INTO "_SECGroupMember" ("GroupKey", "UserId", "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt")
    VALUES ('employee', v_id_binh, v_sys_actor, v_sys_actor, now(), now())
    ON CONFLICT ("GroupKey", "UserId") DO NOTHING;

    -- 8. GS.55169 - LÊ QUANG MINH (Nhân viên Quản trị hệ thống)
    INSERT INTO "_USRAccountDirectory" (
        "Id", "IdSeq", "Username", "Email", "Name", "PasswordHash", "Role",
        "Department", "Position", "JobRole", "Enabled", "Approved", "RegistrationSource",
        "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt"
    ) VALUES (
        v_id_minh, v_seq_minh, 'gs.55169', 'gs.55169@goldsunpackaging.vn', 'Lê Quang Minh', v_pw_hash, 'employee',
        'Phòng ban Quản trị ERP & CNTT', 'Nhân viên Quản trị hệ thống', 'Nhân viên Quản trị hệ thống', true, true, 'admin',
        v_sys_actor, v_sys_actor, now(), now()
    ) ON CONFLICT ("Username") DO UPDATE SET
        "Name" = excluded."Name",
        "Position" = excluded."Position",
        "UpdatedAt" = now();

    INSERT INTO "_SYSActorDirectory" ("IdSeq", "ActorType", "AccountSeq", "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt")
    VALUES (v_seq_minh, 'USER', v_seq_minh, v_sys_actor, v_sys_actor, now(), now())
    ON CONFLICT ("IdSeq") DO NOTHING;

    INSERT INTO "_HRMEmployeeDirectory" (
        "IdSeq", "Code", "FullName", "Department", "Position", "DelegationLevel", "Status", "UserId",
        "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt"
    ) VALUES (
        v_emp_minh, 'GS.55169', 'Lê Quang Minh', 'Phòng ban Quản trị ERP & CNTT', 'Nhân viên Quản trị hệ thống',
        'department', 'active', v_id_minh, v_sys_actor, v_sys_actor, now(), now()
    ) ON CONFLICT ("Code") DO UPDATE SET
        "FullName" = excluded."FullName",
        "Position" = excluded."Position",
        "UserId" = v_id_minh,
        "UpdatedAt" = now();

    INSERT INTO "_SECGroupMember" ("GroupKey", "UserId", "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt")
    VALUES ('employee', v_id_minh, v_sys_actor, v_sys_actor, now(), now())
    ON CONFLICT ("GroupKey", "UserId") DO NOTHING;

END $$;

COMMIT;

