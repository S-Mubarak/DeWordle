import { Test, TestingModule } from "@nestjs/testing";
import { UserProfileService } from "./user-profile.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { User } from "./entities/user.entity";

const mockRepo = {
  findOne: jest.fn(),
  save: jest.fn(),
};

describe("UserProfileService.updateProfile", () => {
  let service: UserProfileService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserProfileService,
        { provide: getRepositoryToken(User), useValue: mockRepo },
      ],
    }).compile();
    service = module.get<UserProfileService>(UserProfileService);
    jest.clearAllMocks();
  });

  it("should update username successfully", async () => {
    const user = { id: "1", username: "old", email: "test@example.com" };
    mockRepo.findOne.mockResolvedValue(user);
    mockRepo.save.mockResolvedValue({ ...user, username: "new" });

    const result = await service.updateProfile("1", { username: "new" });

    expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: "1" } });
    expect(mockRepo.save).toHaveBeenCalledWith({ ...user, username: "new" });
    expect(result.username).toBe("new");
  });

  it("should throw if user not found", async () => {
    mockRepo.findOne.mockResolvedValue(null);
    await expect(service.updateProfile("999", { username: "x" })).rejects.toThrow();
  });
});